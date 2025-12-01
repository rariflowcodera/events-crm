import { redirectToRoute } from "@/lib/routes"
import { Footer } from "@/components/landing/footer"
import { Header } from "@/components/landing/header"

type LandingLayoutProps = {
  children: React.ReactNode
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return redirectToRoute("sign-in")
  return (
    <>
      <Header />
      <div className="mt-40 md:mt-20">{children}</div>
      <Footer />
    </>
  )
}
