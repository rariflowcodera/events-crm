import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components"

import { configuration } from "@/lib/config"
import { LOGO } from "@/lib/constants"

type EmailVerificationMailProps = {
  email: string
  verificationUrl: string
}

export function EmailVerificationMail({ email, verificationUrl }: EmailVerificationMailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email</Preview>
      <Tailwind>
        <Body className="m-auto bg-white font-sans">
          <Container className="w–[465px] mx-auto my-[40px] rounded border border-solid border-border p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={LOGO}
                width="40"
                height="37"
                alt={`${configuration.site.name} Logo`}
                className="mx-auto my-0 rounded-full object-cover"
              />
            </Section>

            <Section className="my-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-10 py-5 text-center text-[12px] font-semibold text-white no-underline"
                href={verificationUrl}
              >
                Verify your email
              </Button>
            </Section>

            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This link expires in 24 hours.
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This email was intended for <span className="text-black">{email}</span>.This invite
              was sent from <span className="text-black">FROM IP</span> located in{" "}
              <span className="text-black">FROM LOCATION</span>. If you were not expecting this
              invitation, you can ignore this email. If you are concerned about your account&apos;s
              safety, please reply to this email to get in touch with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
