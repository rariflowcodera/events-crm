import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

type Testimonial = {
  name: string
  role: string
  image: string
  quote: string
}

const testimonials: Testimonial[] = [
  {
    name: "far1din",
    role: "Developer",
    image: "https://pbs.twimg.com/profile_images/1688259813690552320/YuS9KCx1_400x400.jpg",
    quote:
      "This template saved me lots of time, cheap for the quality and time saved. Would recommend.",
  },

  {
    name: "Alek Zubkho",
    role: "Engineer",
    image: "https://pbs.twimg.com/profile_images/1588862246293225473/r578qEvo_400x400.jpg",
    quote:
      "By far the most advanced SaaS starterkit out there, good documentation and quality code.",
  },
  {
    name: "Anonymous author",
    role: "Doing something",
    image: "https://randomuser.me/api/portraits/men/8.jpg",
    quote:
      "I've been using this template for a while now and it's been a great help. The documentation is clear and the support is helpful. I highly recommend it.",
  },

  {
    name: "mattheo_ss",
    role: "Senior Software Engineer",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    quote: "Lightweight, minimal dependency and just a great overall DX.",
  },
  {
    name: "devthomy",
    role: "Founder needle.ad",
    image: "https://pbs.twimg.com/profile_images/1868429859933863936/-mFA8qej_400x400.jpg",
    quote:
      "I've been using this template for a while now and it's been a great help. The documentation is clear and the support is helpful. I highly recommend it.",
  },
  {
    name: "Wahid",
    role: "Entrepenur",
    image:
      "https://res.cloudinary.com/dowiygzq3/image/upload/v1715075882/32722986_10215439807738334_5894077113148899328_n_zhsaaq.jpg",
    quote:
      "As someone who has basic experience in coding this helped me get started and learn a lot of new things.",
  },
  {
    name: "Ikei",
    role: "Customer",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
    quote: "Worth every penny.",
  },
  {
    name: "Joseph_1",
    role: "Fullstack Developer",
    image: "https://randomuser.me/api/portraits/men/9.jpg",
    quote:
      "Let me tell you, this was very much worth it. The documentation is well documented and all the features you get out of the box is mindblown.",
  },
  {
    name: "danonokoko",
    role: "Founder iStein",
    image:
      "https://res.cloudinary.com/dowiygzq3/image/upload/v1741862748/33592057_1717793221590422_7259058706690605056_n_gvutrp.jpg",
    quote:
      "Worth every penny. This template has features that are not found in other templates and it helped me save a lot of time.",
  },
  {
    name: "Hawk",
    role: "Developer",
    image:
      "https://res.cloudinary.com/dowiygzq3/image/upload/v1681126738/289270143_10224441844505040_1456655112173941454_n_dgrkin.jpg",
    quote: "This template has everything I need to build a great SaaS product.",
  },
  {
    name: "Christopher",
    role: "App developer",
    image: "https://randomuser.me/api/portraits/men/12.jpg",
    quote: "🚀🚀🚀🚀🚀",
  },
  {
    name: "Roland",
    role: "Software Engineer",
    image: "https://randomuser.me/api/portraits/men/13.jpg",
    quote:
      "Setting up everything from the ground up is a really hard, and time consuming process. What you pay for will save you a lot of time.",
  },
]

const chunkArray = (array: Testimonial[], chunkSize: number): Testimonial[][] => {
  const result: Testimonial[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}

const testimonialChunks = chunkArray(testimonials, Math.ceil(testimonials.length / 3))

export function Testimonials() {
  return (
    <section className="border-t">
      <div className="py-16 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-title text-3xl font-semibold">Loved by the Community</h2>
            <p className="text-body mt-6">Listen to what users have to say about it.</p>
          </div>
          <div className="mt-8 grid gap-3 [--color-card:var(--color-muted)] sm:grid-cols-2 md:mt-12 lg:grid-cols-3 dark:[--color-muted:var(--color-zinc-900)]">
            {testimonialChunks.map((chunk, chunkIndex) => (
              <div key={chunkIndex} className="space-y-3 *:border-none *:shadow-none">
                {chunk.map(({ name, role, quote, image }, index) => (
                  <Card key={index}>
                    <CardContent className="grid grid-cols-[auto_1fr] gap-3 pt-6">
                      <Avatar className="size-9">
                        <AvatarImage
                          alt={name}
                          src={image}
                          loading="lazy"
                          width="120"
                          height="120"
                        />
                        <AvatarFallback>ST</AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="font-medium">{name}</h3>

                        <span className="text-muted-foreground block text-sm tracking-wide">
                          {role}
                        </span>

                        <blockquote className="mt-3">
                          <p className="text-gray-700 dark:text-gray-300">{quote}</p>
                        </blockquote>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
