"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import * as XLSX from "xlsx"

import { useBulkCreateGuests } from "@/trpc/hooks/guests-hooks"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert } from "@/components/global/alert"
import { Icons } from "@/components/global/icons"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"

interface GuestCategory {
  id: string
  name: string
  code: string
  color: string | null
}

interface ImportGuestsModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  categories: GuestCategory[]
}

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete"

interface ParsedRow {
  [key: string]: string | number | undefined
}

interface ColumnMapping {
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  entity: string
  department: string
  category: string
}

const requiredFields = ["firstName", "lastName", "email"] as const
const optionalFields = ["phone", "position", "entity", "department", "category"] as const
const allFields = [...requiredFields, ...optionalFields] as const

const fieldLabels: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  position: "Position/Title",
  entity: "Company/Entity",
  department: "Department",
  category: "Category",
}

export function ImportGuestsModal({
  isOpen,
  onClose,
  eventId,
  categories,
}: ImportGuestsModalProps) {
  const t = useTranslations("guest")

  // State
  const [step, setStep] = useState<ImportStep>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    entity: "",
    department: "",
    category: "",
  })
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>(
    categories.length > 0 ? categories[0].id : ""
  )
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] }>({
    success: 0,
    errors: [],
  })

  const { mutate: bulkCreate, isPending } = useBulkCreateGuests({
    onSuccess: (data) => {
      setImportResult({ success: data.createdCount, errors: [] })
      setStep("complete")
    },
    onError: () => {
      setStep("preview")
    },
  })

  // Handle file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { defval: "" })

        if (jsonData.length === 0) {
          return
        }

        // Get column headers
        const headers = Object.keys(jsonData[0])
        setColumns(headers)
        setParsedData(jsonData)

        // Auto-detect column mappings
        const autoMapping: ColumnMapping = {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          position: "",
          entity: "",
          department: "",
          category: "",
        }

        headers.forEach((header) => {
          const lowerHeader = header.toLowerCase().replace(/[^a-z]/g, "")
          if (lowerHeader.includes("firstname") || lowerHeader === "first") {
            autoMapping.firstName = header
          } else if (lowerHeader.includes("lastname") || lowerHeader === "last") {
            autoMapping.lastName = header
          } else if (lowerHeader.includes("email") || lowerHeader.includes("mail")) {
            autoMapping.email = header
          } else if (lowerHeader.includes("phone") || lowerHeader.includes("mobile") || lowerHeader.includes("tel")) {
            autoMapping.phone = header
          } else if (lowerHeader.includes("position") || lowerHeader.includes("title") || lowerHeader.includes("role")) {
            autoMapping.position = header
          } else if (lowerHeader.includes("company") || lowerHeader.includes("entity") || lowerHeader.includes("organization") || lowerHeader.includes("org")) {
            autoMapping.entity = header
          } else if (lowerHeader.includes("department") || lowerHeader.includes("dept")) {
            autoMapping.department = header
          } else if (lowerHeader.includes("category") || lowerHeader.includes("cat") || lowerHeader === "type") {
            autoMapping.category = header
          }
        })

        setMapping(autoMapping)
        setStep("mapping")
      } catch {
        // Error parsing file
      }
    }
    reader.readAsArrayBuffer(selectedFile)
  }, [])

  // Validate mapping - firstName, lastName, and email are required
  const isMappingValid = mapping.firstName && mapping.lastName && mapping.email

  // Get preview data
  const getPreviewData = useCallback(() => {
    return parsedData.slice(0, 5).map((row) => ({
      firstName: String(row[mapping.firstName] || ""),
      lastName: String(row[mapping.lastName] || ""),
      email: String(row[mapping.email] || ""),
      phone: mapping.phone ? String(row[mapping.phone] || "") : "",
      position: mapping.position ? String(row[mapping.position] || "") : "",
      entity: mapping.entity ? String(row[mapping.entity] || "") : "",
      department: mapping.department ? String(row[mapping.department] || "") : "",
      category: mapping.category ? String(row[mapping.category] || "") : "",
    }))
  }, [parsedData, mapping])

  // Helper to validate email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Helper to find category by code (case-insensitive)
  const findCategoryByCode = useCallback((code: string) => {
    const normalizedCode = code.trim().toUpperCase()
    return categories.find((cat) => cat.code.toUpperCase() === normalizedCode)
  }, [categories])

  // Handle import
  const handleImport = useCallback(() => {
    if (!defaultCategoryId) return

    setStep("importing")
    setImportProgress(0)

    let skippedMissingEmail = 0
    let skippedInvalidCategory = 0
    let skippedMissingName = 0

    const guests = parsedData
      .filter((row) => {
        const firstName = String(row[mapping.firstName] || "").trim()
        const lastName = String(row[mapping.lastName] || "").trim()
        const email = String(row[mapping.email] || "").trim()

        // Check required fields
        if (!firstName || !lastName) {
          skippedMissingName++
          return false
        }

        // Email is now required
        if (!email || !isValidEmail(email)) {
          skippedMissingEmail++
          return false
        }

        // If category column is mapped and has a value, validate it
        if (mapping.category) {
          const categoryCode = String(row[mapping.category] || "").trim()
          if (categoryCode && !findCategoryByCode(categoryCode)) {
            skippedInvalidCategory++
            return false
          }
        }

        return true
      })
      .map((row) => {
        // Determine category: use from row if valid, otherwise default
        let categoryId = defaultCategoryId
        if (mapping.category) {
          const categoryCode = String(row[mapping.category] || "").trim()
          if (categoryCode) {
            const foundCategory = findCategoryByCode(categoryCode)
            if (foundCategory) {
              categoryId = foundCategory.id
            }
          }
        }

        return {
          categoryId,
          firstName: String(row[mapping.firstName] || "").trim(),
          lastName: String(row[mapping.lastName] || "").trim(),
          email: String(row[mapping.email] || "").trim(),
          phone: mapping.phone ? String(row[mapping.phone] || "").trim() || undefined : undefined,
          position: mapping.position ? String(row[mapping.position] || "").trim() || undefined : undefined,
          entity: mapping.entity ? String(row[mapping.entity] || "").trim() || undefined : undefined,
          department: mapping.department ? String(row[mapping.department] || "").trim() || undefined : undefined,
        }
      })

    const totalSkipped = skippedMissingName + skippedMissingEmail + skippedInvalidCategory

    if (guests.length === 0) {
      const errorMessages: string[] = []
      if (skippedMissingName > 0) errorMessages.push(`${skippedMissingName} missing name`)
      if (skippedMissingEmail > 0) errorMessages.push(`${skippedMissingEmail} missing/invalid email`)
      if (skippedInvalidCategory > 0) errorMessages.push(`${skippedInvalidCategory} invalid category`)
      setImportResult({
        success: 0,
        errors: [errorMessages.length > 0 ? `Skipped all rows: ${errorMessages.join(", ")}` : "No valid guests found in file"]
      })
      setStep("complete")
      return
    }

    // Store skip info for result display
    const skipInfo = totalSkipped > 0
      ? `Skipped ${totalSkipped} row${totalSkipped !== 1 ? "s" : ""}: ${[
          skippedMissingEmail > 0 ? `${skippedMissingEmail} missing/invalid email` : "",
          skippedInvalidCategory > 0 ? `${skippedInvalidCategory} invalid category` : "",
          skippedMissingName > 0 ? `${skippedMissingName} missing name` : "",
        ].filter(Boolean).join(", ")}`
      : ""

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90))
    }, 200)

    bulkCreate(
      { eventId, guests },
      {
        onSuccess: (data) => {
          setImportResult({
            success: data.createdCount,
            errors: skipInfo ? [skipInfo] : []
          })
          setStep("complete")
        },
        onSettled: () => {
          clearInterval(progressInterval)
          setImportProgress(100)
        },
      }
    )
  }, [parsedData, mapping, defaultCategoryId, eventId, bulkCreate, findCategoryByCode])

  // Reset and close
  const handleClose = useCallback(() => {
    setStep("upload")
    setFile(null)
    setParsedData([])
    setColumns([])
    setMapping({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      position: "",
      entity: "",
      department: "",
      category: "",
    })
    setImportProgress(0)
    setImportResult({ success: 0, errors: [] })
    onClose()
  }, [onClose])

  // Download template with sample data
  const handleDownloadTemplate = useCallback(() => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Position", "Organization/Entity", "Department", "Category"]

    // Create sample rows - one for each category
    const sampleRows = categories.map((cat, i) => [
      `Sample First ${i + 1}`,
      `Sample Last ${i + 1}`,
      `sample${i + 1}@example.com`,
      "",
      "",
      "",
      "",
      cat.code,
    ])

    // If no categories, add a placeholder row
    if (sampleRows.length === 0) {
      sampleRows.push(["John", "Doe", "john@example.com", "", "", "", "", ""])
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])

    // Set column widths for better readability
    ws["!cols"] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 15 }, // Position
      { wch: 20 }, // Organization/Entity
      { wch: 15 }, // Department
      { wch: 12 }, // Category
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Guests")
    XLSX.writeFile(wb, "guest-import-template.xlsx")
  }, [categories])

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("import.title")}</SheetTitle>
          <SheetDescription>
            Import guests from an Excel file (.xlsx, .xls) or CSV
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 px-4 space-y-6">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              {categories.length === 0 ? (
                <Alert
                  variant="warning"
                  title="No categories defined"
                  icon="alertTriangle"
                >
                  Please create at least one guest category before importing guests.
                </Alert>
              ) : (
                <>
                  <div className="rounded-lg border-2 border-dashed p-8 text-center">
                    <Icons.upload className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drag and drop your file here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      style={{ position: "relative" }}
                    />
                    <Button variant="outline" className="mt-4" asChild>
                      <label className="cursor-pointer">
                        <Icons.upload className="mr-2 h-4 w-4" />
                        Select File
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </Button>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <h4 className="text-sm font-medium">Required columns:</h4>
                    <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                      <li>First Name</li>
                      <li>Last Name</li>
                      <li>Email</li>
                    </ul>
                    <h4 className="mt-3 text-sm font-medium">Optional columns:</h4>
                    <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                      <li>Phone</li>
                      <li>Position/Title</li>
                      <li>Company/Entity</li>
                      <li>Department</li>
                      <li>Category (uses category code: {categories.map(c => c.code).join(", ")})</li>
                    </ul>

                    <Button
                      variant="link"
                      className="mt-3 h-auto p-0 text-sm"
                      onClick={handleDownloadTemplate}
                    >
                      <Icons.arrowDown className="mr-2 h-4 w-4" />
                      Download template with sample data
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "mapping" && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  File: <span className="font-medium">{file?.name}</span> ({parsedData.length} rows)
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Map your columns</h4>

                <div className="space-y-3">
                  {allFields.map((field) => (
                    <div key={field} className="grid grid-cols-2 gap-4 items-center">
                      <Label className="flex items-center">
                        {fieldLabels[field]}
                        {requiredFields.includes(field as typeof requiredFields[number]) && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      <Select
                        value={mapping[field as keyof ColumnMapping] || "__none__"}
                        onValueChange={(value) =>
                          setMapping((prev) => ({ ...prev, [field]: value === "__none__" ? "" : value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- Not mapped --</SelectItem>
                          {columns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Label>Default Category (used when Category column is empty)</Label>
                  <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: category.color || "#6366f1" }}
                            />
                            {category.name} ({category.code})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    If a Category column is mapped, guests will use their row&apos;s category code. Otherwise, this default is used.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button onClick={() => setStep("preview")} disabled={!isMappingValid}>
                  Preview Import
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium">Preview (first 5 rows)</h4>
                <p className="text-sm text-muted-foreground">
                  {parsedData.length} total guests will be imported
                </p>
              </div>

              <ScrollArea className="h-[300px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPreviewData().map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {row.firstName} {row.lastName}
                        </TableCell>
                        <TableCell>{row.email || "-"}</TableCell>
                        <TableCell>{row.entity || "-"}</TableCell>
                        <TableCell>{row.category || "(default)"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  Back
                </Button>
                <Button onClick={handleImport}>
                  Import {parsedData.length} Guests
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="space-y-6 py-8 text-center">
              <Icons.loader className="mx-auto h-10 w-10 animate-spin text-primary" />
              <div>
                <h4 className="text-lg font-medium">Importing guests...</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we import your guests
                </p>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && (
            <div className="space-y-6 py-8 text-center">
              {importResult.success > 0 ? (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <Icons.check className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium">Import Complete!</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Successfully imported {importResult.success} guest{importResult.success !== 1 ? "s" : ""}
                    </p>
                    {importResult.errors.length > 0 && (
                      <p className="text-sm text-amber-600 mt-2">
                        {importResult.errors[0]}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <Icons.x className="h-8 w-8 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium">Import Failed</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {importResult.errors[0] || "An error occurred during import"}
                    </p>
                  </div>
                </>
              )}

              <Button onClick={handleClose} className="mt-4">
                Done
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
