import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function Faq() {
  return (
    <section id="FAQ" className="mx-auto flex max-w-7xl flex-col gap-y-12 px-8 py-24 md:flex-row">
      <div className="flex basis-1/2 flex-col text-left">
        <p className="mb-8 w-full text-3xl font-medium sm:text-4xl md:w-[25ch]">
          Frequently Asked Questions
        </p>
        <div className="font-medium text-primary/80">
          Have another question? Contact me on
          <a
            className="ml-1 font-semibold text-primary underline underline-offset-2"
            target="_blank"
            href="https://x.com/kewinversi"
          >
            Twitter
          </a>
          <span className="mx-1">or by</span>
          <a
            href="mailto:kevinnminh@gmail.com"
            target="_blank"
            className="ml-1 font-semibold text-primary underline underline-offset-2"
          >
            email
          </a>
          .
        </div>
      </div>
      <Accordion type="single" collapsible className="basis-1/2">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-sm font-medium md:text-lg">
            What is included in the template?
          </AccordionTrigger>
          <AccordionContent>
            Our template includes everything you need to launch a SaaS: Next.js 15 with App Router,
            TypeScript, Tailwind CSS, authentication system, database integration, workspace
            management, and more. It&apos;s a complete foundation for your next project.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger className="text-sm font-medium md:text-lg">
            Do I need to pay any additional fees or subscriptions?
          </AccordionTrigger>
          <AccordionContent>
            No, this is a one-time purchase. You get lifetime access to the template and its
            updates. However, you&apos;ll need to cover your own hosting and any third-party
            services you choose to integrate.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger className="text-smse font-medium md:text-lg">
            Can I use this template for commercial projects?
          </AccordionTrigger>
          <AccordionContent>
            Yes, you can use this template for both personal and commercial projects. Once
            purchased, you can build and deploy as many projects as you want with no additional
            licensing fees.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-4">
          <AccordionTrigger className="text-smse font-medium md:text-lg">
            What level of experience do I need?
          </AccordionTrigger>
          <AccordionContent>
            Basic knowledge of React, Next.js, and TypeScript is recommended. The template comes
            with detailed documentation to help you get started, but some development experience
            will be beneficial.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5">
          <AccordionTrigger className="text-sm font-medium md:text-lg">
            What kind of support is included?
          </AccordionTrigger>
          <AccordionContent>
            The template comes with comprehensive documentation. Premium plan users get access to
            one-on-one support for implementation questions and technical issues. All users receive
            bug fixes and compatibility updates.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-6">
          <AccordionTrigger className="text-sm font-medium md:text-lg">
            Will I get future updates?
          </AccordionTrigger>
          <AccordionContent>
            Yes! Premium plan users get lifetime updates, including new features and improvements.
            Basic plan users receive critical bug fixes and security updates.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-7">
          <AccordionTrigger className="text-smse font-medium md:text-lg">
            Can I request new features?
          </AccordionTrigger>
          <AccordionContent>
            Premium plan users can request and suggest new features. We regularly update the
            template based on user feedback and emerging best practices in the Next.js ecosystem.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
