"use client"

import { useRef, useCallback, useImperativeHandle, forwardRef } from "react"
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { html } from "@codemirror/lang-html"
import { EditorView } from "@codemirror/view"

export interface EditorHandle {
  insertAtCursor: (text: string) => void
}

interface EmailTemplateEditorProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  placeholder?: string
  minHeight?: string
  direction?: "ltr" | "rtl"
  language?: "html" | "text"
}

export const EmailTemplateEditor = forwardRef<EditorHandle, EmailTemplateEditorProps>(
  (
    {
      value,
      onChange,
      onFocus,
      placeholder = "",
      minHeight = "200px",
      direction = "ltr",
      language = "html",
    },
    ref
  ) => {
    const editorRef = useRef<ReactCodeMirrorRef>(null)

    const insertAtCursor = useCallback((text: string) => {
      const view = editorRef.current?.view
      if (!view) return

      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      })
      view.focus()
    }, [])

    useImperativeHandle(ref, () => ({ insertAtCursor }), [insertAtCursor])

    const extensions = [EditorView.lineWrapping]
    if (language === "html") {
      extensions.push(html())
    }

    return (
      <div
        className="rounded-md border overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        dir={direction}
      >
        <CodeMirror
          ref={editorRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          extensions={extensions}
          basicSetup={{
            lineNumbers: true,
            foldGutter: language === "html",
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            bracketMatching: language === "html",
            autocompletion: false,
          }}
          style={{ minHeight }}
          className="text-sm [&_.cm-editor]:outline-none [&_.cm-focused]:outline-none"
          onFocus={onFocus}
        />
      </div>
    )
  }
)

EmailTemplateEditor.displayName = "EmailTemplateEditor"
