import { SectionWrapper } from "@/components/layout/section-wrapper"
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton"

export default function EventDetailLoading() {
  return (
    <SectionWrapper className="max-w-6xl">
      <EventDetailSkeleton />
    </SectionWrapper>
  )
}
