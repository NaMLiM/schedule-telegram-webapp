import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface TabBarProps {
  activeTab: 'calendar' | 'list'
  onTabChange: (tab: 'calendar' | 'list') => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="px-4 py-2">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'calendar' | 'list')}>
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="flex-1">
            📅 Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="flex-1">
            📋 List
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
