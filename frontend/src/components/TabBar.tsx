import { CalendarDays, List } from 'lucide-react'

interface TabBarProps {
  activeTab: 'calendar' | 'list'
  onTabChange: (tab: 'calendar' | 'list') => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      className="sticky bottom-0 z-20 border-t bg-card"
      style={{ paddingBottom: 'var(--content-safe-area-bottom, var(--safe-area-bottom))' }}
    >
      <div className="flex items-center justify-around py-1 max-w-[430px] mx-auto">
        <button
          onClick={() => onTabChange('calendar')}
          className={`
            flex flex-col items-center gap-0.5 py-1.5 px-6 rounded-lg transition-colors
            ${
              activeTab === 'calendar'
                ? 'text-primary'
                : 'text-muted-foreground/60'
            }
          `}
        >
          <CalendarDays className="size-5" />
          <span className="text-[10px] font-medium">Calendar</span>
        </button>

        <button
          onClick={() => onTabChange('list')}
          className={`
            flex flex-col items-center gap-0.5 py-1.5 px-6 rounded-lg transition-colors
            ${
              activeTab === 'list'
                ? 'text-primary'
                : 'text-muted-foreground/60'
            }
          `}
        >
          <List className="size-5" />
          <span className="text-[10px] font-medium">List</span>
        </button>
      </div>
    </div>
  )
}
