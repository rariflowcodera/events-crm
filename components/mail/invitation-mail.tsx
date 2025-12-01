import { UserType, WorkspaceType } from "@/server/db/schema-types"
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components"

import { configuration } from "@/lib/config"
import { LOGO, RIGHT_ARROW } from "@/lib/constants"

type InvitationEmailProps = {
  email: string | string[]
  workspaceName: WorkspaceType["slug"]
  inviteString: string
  invitedBy: UserType["name"]
  logo: WorkspaceType["logo"]
  invitedByImage: UserType["image"]
}

export function InvitationMail({
  email,
  workspaceName,
  inviteString,
  invitedBy,
  logo,
  invitedByImage,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been invited!</Preview>
      <Tailwind>
        <Body className="m-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-[450px] p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={configuration.site.logo}
                width="49"
                height="49"
                alt={`${configuration.site.name} Logo`}
                className="mx-auto my-0 rounded-full object-cover"
              />
            </Section>

            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Join <strong>{workspaceName}</strong> on <strong>{configuration.site.name}</strong>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">Hello, {email}</Text>
            <Text className="text-[14px] leading-[24px] text-black">
              <strong>{invitedBy}</strong> has invited you to <strong>{workspaceName}</strong> team
              on <strong>{configuration.site.name}</strong>
            </Text>

            <Section>
              <Row>
                <Column align="right" className="flex items-center justify-center">
                  {invitedByImage ? (
                    <Img
                      className="rounded-full select-none"
                      src={invitedByImage}
                      width="64"
                      height="64"
                    />
                  ) : (
                    <Text className="text-[17px] leading-[24px] font-semibold text-black uppercase">
                      {invitedBy.slice(0, 2)}
                    </Text>
                  )}
                </Column>
                <Column align="center">
                  <Img src={RIGHT_ARROW} width="12" height="9" alt="invited you to" />
                </Column>
                <Column align="left" className="flex items-center justify-center">
                  <Img
                    className="rounded-full select-none"
                    src={logo ?? LOGO}
                    width="64"
                    height="64"
                  />
                </Column>
              </Row>
            </Section>

            <Section className="my-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-7 py-4 text-center text-[12px] font-semibold text-white no-underline"
                href={inviteString}
              >
                Join the team
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-black">
              or copy and paste this URL into your browser:{" "}
              <Link href={inviteString} className="text-blue-600 no-underline">
                {inviteString}
              </Link>
            </Text>
            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              This invitation was intended for <span className="text-black">{email}</span>.This
              invite was sent from <span className="text-black">FROM IP</span> located in{" "}
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
