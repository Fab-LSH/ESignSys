import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Stamp, FileText, Settings, Download } from 'lucide-react'
import SealManagement from './SealManagement'
import FileProcessing from './FileProcessing'

function Layout() {
  const [activeTab, setActiveTab] = useState('processing')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Stamp className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">电子签章系统</h1>
            </div>
            <div className="text-sm text-gray-500">
              安全、高效的合同电子签章解决方案
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="processing" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>文件签章</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>签章管理</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="processing">
            <FileProcessing />
          </TabsContent>

          <TabsContent value="management">
            <SealManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default Layout

