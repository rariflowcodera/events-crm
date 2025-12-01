import { SectionWrapper } from "@/components/layout/section-wrapper"
import { EventsListSkeleton } from "@/components/events/events-list-skeleton"

export default function EventsLoading() {
  return (
    <SectionWrapper>
      <EventsListSkeleton />
    </SectionWrapper>
  )
}
