import React from "react"
import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { AnimatedGroup } from "@/components/extended/animated-group"
import { HeroVideoDialog } from "@/components/extended/hero-video-dialog"
import { TextEffect } from "@/components/extended/text-effect"

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
}

export function Hero() {
  return (
    <>
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
        >
          <div className="absolute top-0 left-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="absolute top-0 left-0 h-320 w-60 [translate:5%_-50%] -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
          <div className="absolute top-0 left-0 h-320 w-60 -translate-y-87.5 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24 md:pt-36">
            <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"></div>
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mt-0 lg:mr-auto">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href="https://app.boringtemplate.com"
                    target="_blank"
                    className="group bg-muted hover:bg-background dark:hover:border-t-border mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
                  >
                    <span className="text-foreground text-sm">
                      🎉 Updated 2 days ago - prettier docs
                    </span>

                    <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

                    <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </AnimatedGroup>

                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="mt-8 text-6xl text-balance md:text-7xl lg:mt-16 xl:text-[5.25rem]"
                >
                  Not your average SaaS boilerplate
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mx-auto mt-8 max-w-2xl text-lg text-balance"
                >
                  Spend less time on setup and more time building. A SaaS starter kit with the
                  features you actually need. Not convinced? Try the demo.
                </TextEffect>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div key={1} className="bg-foreground/10 rounded-xl border p-0.5">
                    <Button asChild size="lg" className="rounded-xl px-5 text-base">
                      <Link href="https://app.boringtemplate.com" target="_blank">
                        <span className="text-nowrap">Try Demo</span>
                      </Link>
                    </Button>
                  </div>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-10 rounded-xl px-5"
                  >
                    <Link href="https://docs.boringtemplate.com" target="_blank">
                      <span className="text-nowrap">Documentation</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="mx-auto mt-5 flex size-fit flex-col items-center justify-center gap-2 md:flex-row">
                <a
                  href="https://www.producthunt.com/posts/the-boring-template?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-the&#0045;boring&#0045;template"
                  target="_blank"
                  className="mx-auto w-fit"
                >
                  <img
                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=723687&theme=light"
                    alt="The&#0032;Boring&#0032;Template - Just&#0032;a&#0032;one&#0032;of&#0032;the&#0032;many&#0032;Boring&#0032;SaaS&#0032;Boilerplates | Product Hunt"
                    style={{ width: "200px", height: "43px" }}
                    width="250"
                    height="54"
                    className="mx-auto"
                  />
                </a>

                <div className="mx-auto flex flex-col justify-start gap-3 md:flex-row md:justify-start">
                  <div className="mx-auto flex justify-start -space-x-5 overflow-hidden md:mx-0 md:justify-start">
                    <Avatar className="relative inline-flex overflow-hidden border-2">
                      <AvatarImage
                        className="object-cover"
                        src="https://res.cloudinary.com/dowiygzq3/image/upload/v1722859390/30728579_1617507974963433_19221181240442880_n_kelp9f.jpg"
                        alt="@kevin"
                      />
                      <AvatarFallback>AV</AvatarFallback>
                    </Avatar>
                    <Avatar className="relative inline-flex overflow-hidden border">
                      <AvatarImage
                        className="object-cover"
                        src="https://res.cloudinary.com/dowiygzq3/image/upload/v1715075882/32722986_10215439807738334_5894077113148899328_n_zhsaaq.jpg"
                        alt="@wahid"
                      />
                      <AvatarFallback>AV</AvatarFallback>
                    </Avatar>
                    <Avatar className="relative inline-flex overflow-hidden border">
                      <AvatarImage
                        className="object-cover"
                        src="https://res.cloudinary.com/dowiygzq3/image/upload/v1681126738/289270143_10224441844505040_1456655112173941454_n_dgrkin.jpg"
                        alt="@haakon"
                      />
                      <AvatarFallback>AV</AvatarFallback>
                    </Avatar>
                    <Avatar className="relative inline-flex overflow-hidden border">
                      <AvatarImage
                        className="object-cover"
                        src="https://pbs.twimg.com/profile_images/1688259813690552320/YuS9KCx1_400x400.jpg"
                        alt="@erai"
                      />
                      <AvatarFallback>AV</AvatarFallback>
                    </Avatar>
                    <Avatar className="relative inline-flex overflow-hidden border">
                      <AvatarImage
                        className="object-cover"
                        src="https://pbs.twimg.com/profile_images/1868429859933863936/-mFA8qej_400x400.jpg"
                        alt="@thomy"
                      />
                      <AvatarFallback>AV</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col items-start justify-center gap-1 md:items-start">
                    <div className="relative mx-auto inline-flex md:mx-0">
                      <Star className="size-4 fill-yellow-500 text-yellow-500" />
                      <Star className="size-4 fill-yellow-500 text-yellow-500" />
                      <Star className="size-4 fill-yellow-500 text-yellow-500" />
                      <Star className="size-4 fill-yellow-500 text-yellow-500" />
                      <Star className="size-4 fill-yellow-500 text-yellow-500" />
                    </div>
                    <div className="text-primary/80 font-light">
                      <span className="text-primary/80 text-sm font-semibold">97</span> people are
                      loving it
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedGroup>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="relative mt-8 overflow-hidden px-2 sm:mt-12 sm:mr-0 md:mt-20">
                <div className="relative mx-auto max-w-5xl">
                  <HeroVideoDialog
                    className="block dark:hidden"
                    animationStyle="from-center"
                    videoSrc="https://www.youtube.com/embed/F7EuzGzabxU?si=WkmqjPN4WSdl_fuP"
                    thumbnailSrc="https://res.cloudinary.com/dowiygzq3/image/upload/v1741086992/Screenshot_2025-03-04_at_12.13.54_gio3sc.png"
                    thumbnailAlt="Hero video"
                  />
                  <HeroVideoDialog
                    className="hidden dark:block"
                    animationStyle="from-center"
                    videoSrc="https://www.youtube.com/embed/F7EuzGzabxU?si=WkmqjPN4WSdl_fuP"
                    thumbnailSrc="https://res.cloudinary.com/dowiygzq3/image/upload/v1741086992/Screenshot_2025-03-04_at_12.13.54_gio3sc.png"
                    thumbnailAlt="Hero video"
                  />
                  <div className="to-background/60 pointer-events-none absolute inset-x-0 bottom-0 z-10 h-full max-h-[500px] rounded-md bg-gradient-to-b from-transparent"></div>
                </div>
              </div>
            </AnimatedGroup>
            <div className="absolute left-0 z-[-1] hidden h-[40vh] overflow-hidden bg-gradient-to-t from-violet-600/20 to-pink-200 blur-[80px] md:right-0 md:bottom-96 md:left-1/2 md:flex md:h-96 md:w-[500px] xl:top-1/2 2xl:left-1/2 2xl:h-96 2xl:w-[600px] 2xl:blur-[120px]"></div>
          </div>
        </section>
        <section className="bg-background py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-lg font-medium">
              Integrated with our favorite technologies.
            </h2>
            <div className="mx-auto mt-20 flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16 sm:gap-y-12">
              <img
                className="h-12 w-fit max-w-32 rounded-md"
                src="https://res.cloudinary.com/dowiygzq3/image/upload/v1741087634/108468352_rdoifc.png"
                alt="Drizzle ORM"
                height="30"
                width="auto"
              />
              <img
                className="h-12 w-fit max-w-32"
                src="https://res.cloudinary.com/dowiygzq3/image/upload/v1741087544/typescript_wrgqvm.webp"
                alt="Typescript"
                height="30"
                width="auto"
              />
              <img
                className="h-12 w-fit max-w-32 rounded-md"
                src="https://res.cloudinary.com/dowiygzq3/image/upload/v1740732044/163827765_qn4qmt.png"
                alt="Better-auth"
                height="30"
                width="auto"
              />
              <img
                className="h-12 w-fit max-w-32 rounded-md"
                src="https://res.cloudinary.com/dowiygzq3/image/upload/v1741087611/neon-logomark-dark-color_1_bzq0v2.svg"
                alt="Neon"
                height="30"
                width="auto"
              />
              <img
                className="h-7 w-fit max-w-32 md:h-8"
                src="/turbopack.svg"
                alt="Turbo"
                height="30"
                width="auto"
              />
              <img
                className="h-8 w-fit max-w-32"
                src="/postgre.svg"
                alt="Postgre"
                height="30"
                width="auto"
              />

              <img
                className="h-10 w-fit max-w-32"
                src="/aws.png"
                alt="Aws"
                height="30"
                width="auto"
              />
              <img
                className="h-5 w-fit max-w-32"
                src="/nextjs.svg"
                alt="Nextjs"
                height="35"
                width="auto"
              />
              <img
                className="h-7 w-fit max-w-32"
                src="/tailwindcss.svg"
                alt="Tailwindcss"
                height="20"
                width="auto"
              />
              <img
                className="h-10 w-fit max-w-32"
                src="/react.svg"
                alt="React"
                height="25"
                width="auto"
              />

              <img
                className="h-12 w-fit max-w-32"
                src="/stripe.svg"
                alt="Stripe"
                height="30"
                width="auto"
              />
              <img
                className="h-7 w-fit max-w-32"
                src="/vercel.svg"
                alt="Vercel"
                height="30"
                width="auto"
              />
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
