import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { Plus, Edit, Trash2, Eye, Copy, Download, Upload, Settings } from 'lucide-react'

function SealManagement() {
  const [seals, setSeals] = useState([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedSeal, setSelectedSeal] = useState(null)
  const [newSeal, setNewSeal] = useState({
    name: '',
    type: 'circular',
    description: '',
    color: '#dc2626',
    size: 'medium',
    borderWidth: 2,
    fontSize: 14,
    status: 'active'
  })

  // 模拟从后端加载印章数据
  useEffect(() => {
    loadSeals()
  }, [])

  const loadSeals = async () => {
    // 模拟API调用
    const mockSeals = [
      {
        id: 1,
        name: '示例科技有限公司',
        type: 'circular',
        description: '公司公章，用于正式文件签署',
        color: '#dc2626',
        size: 'large',
        borderWidth: 3,
        fontSize: 16,
        status: 'active',
        createdAt: '2025-01-20',
        lastUsed: '2025-01-21',
        usageCount: 15
      },
      {
        id: 2,
        name: '上海集采汇',
        type: 'square',
        description: '合作方印章',
        color: '#2563eb',
        size: 'medium',
        borderWidth: 2,
        fontSize: 14,
        status: 'active',
        createdAt: '2025-01-19',
        lastUsed: '2025-01-20',
        usageCount: 8
      },
      {
        id: 3,
        name: '财务专用章',
        type: 'circular',
        description: '财务部门专用印章',
        color: '#059669',
        size: 'medium',
        borderWidth: 2,
        fontSize: 12,
        status: 'inactive',
        createdAt: '2025-01-18',
        lastUsed: '2025-01-19',
        usageCount: 3
      }
    ]
    setSeals(mockSeals)
  }

  const handleCreateSeal = async () => {
    const sealData = {
      ...newSeal,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: null,
      usageCount: 0
    }
    
    setSeals([...seals, sealData])
    setNewSeal({
      name: '',
      type: 'circular',
      description: '',
      color: '#dc2626',
      size: 'medium',
      borderWidth: 2,
      fontSize: 14,
      status: 'active'
    })
    setIsCreateDialogOpen(false)
  }

  const handleEditSeal = (seal) => {
    setSelectedSeal(seal)
    setNewSeal({ ...seal })
    setIsEditDialogOpen(true)
  }

  const handleUpdateSeal = async () => {
    setSeals(seals.map(seal => 
      seal.id === selectedSeal.id ? { ...newSeal, id: selectedSeal.id } : seal
    ))
    setIsEditDialogOpen(false)
    setSelectedSeal(null)
  }

  const handleDeleteSeal = async (sealId) => {
    if (confirm('确定要删除这个印章吗？此操作不可撤销。')) {
      setSeals(seals.filter(seal => seal.id !== sealId))
    }
  }

  const handleViewSeal = (seal) => {
    setSelectedSeal(seal)
    setIsViewDialogOpen(true)
  }

  const handleDuplicateSeal = (seal) => {
    const duplicatedSeal = {
      ...seal,
      id: Date.now(),
      name: `${seal.name} (副本)`,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: null,
      usageCount: 0
    }
    setSeals([...seals, duplicatedSeal])
  }

  const handleToggleStatus = (sealId) => {
    setSeals(seals.map(seal => 
      seal.id === sealId 
        ? { ...seal, status: seal.status === 'active' ? 'inactive' : 'active' }
        : seal
    ))
  }

  const handleExportSeal = (seal) => {
    // 模拟导出印章配置
    const sealConfig = {
      name: seal.name,
      type: seal.type,
      color: seal.color,
      size: seal.size,
      borderWidth: seal.borderWidth,
      fontSize: seal.fontSize
    }
    
    const dataStr = JSON.stringify(sealConfig, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${seal.name}_配置.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderSealPreview = (seal) => {
    const sizeMap = {
      small: 'w-12 h-12 text-xs',
      medium: 'w-16 h-16 text-sm',
      large: 'w-20 h-20 text-base'
    }
    
    const baseClasses = `flex items-center justify-center text-white font-bold border-2 ${sizeMap[seal.size]}`
    const shapeClasses = seal.type === 'circular' ? 'rounded-full' : 'rounded-lg'
    
    return (
      <div 
        className={`${baseClasses} ${shapeClasses}`}
        style={{ 
          backgroundColor: seal.color,
          borderColor: seal.color,
          borderWidth: `${seal.borderWidth}px`,
          fontSize: `${seal.fontSize}px`
        }}
      >
        {seal.name.length > 6 ? seal.name.substring(0, 6) + '...' : seal.name}
      </div>
    )
  }

  const SealForm = ({ seal, onChange, isEdit = false }) => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="sealName">印章名称</Label>
        <Input
          id="sealName"
          placeholder="请输入印章名称"
          value={seal.name}
          onChange={(e) => onChange({ ...seal, name: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="sealType">印章类型</Label>
        <Select value={seal.type} onValueChange={(value) => onChange({ ...seal, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="circular">圆形章</SelectItem>
            <SelectItem value="square">方形章</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">描述</Label>
        <Textarea
          id="description"
          placeholder="请输入印章描述（可选）"
          value={seal.description}
          onChange={(e) => onChange({ ...seal, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="color">印章颜色</Label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              id="color"
              value={seal.color}
              onChange={(e) => onChange({ ...seal, color: e.target.value })}
              className="w-12 h-8 rounded border"
            />
            <Input
              value={seal.color}
              onChange={(e) => onChange({ ...seal, color: e.target.value })}
              placeholder="#dc2626"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="size">印章大小</Label>
          <Select value={seal.size} onValueChange={(value) => onChange({ ...seal, size: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">小 (48px)</SelectItem>
              <SelectItem value="medium">中 (64px)</SelectItem>
              <SelectItem value="large">大 (80px)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="borderWidth">边框宽度</Label>
          <Input
            id="borderWidth"
            type="number"
            min="1"
            max="5"
            value={seal.borderWidth}
            onChange={(e) => onChange({ ...seal, borderWidth: parseInt(e.target.value) || 2 })}
          />
        </div>

        <div>
          <Label htmlFor="fontSize">字体大小</Label>
          <Input
            id="fontSize"
            type="number"
            min="8"
            max="24"
            value={seal.fontSize}
            onChange={(e) => onChange({ ...seal, fontSize: parseInt(e.target.value) || 14 })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="status"
          checked={seal.status === 'active'}
          onCheckedChange={(checked) => onChange({ ...seal, status: checked ? 'active' : 'inactive' })}
        />
        <Label htmlFor="status">启用印章</Label>
      </div>

      {/* 预览 */}
      <div>
        <Label>预览效果</Label>
        <div className="mt-2 p-4 bg-gray-50 rounded-lg flex justify-center">
          {renderSealPreview(seal)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">签章管理</h2>
          <p className="text-gray-600 mt-1">管理电子印章和骑缝章</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              创建印章
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>创建新印章</DialogTitle>
            </DialogHeader>
            <SealForm seal={newSeal} onChange={setNewSeal} />
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateSeal} disabled={!newSeal.name}>
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{seals.length}</div>
            <div className="text-sm text-gray-600">总印章数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {seals.filter(s => s.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">启用中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {seals.filter(s => s.type === 'circular').length}
            </div>
            <div className="text-sm text-gray-600">圆形章</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {seals.filter(s => s.type === 'square').length}
            </div>
            <div className="text-sm text-gray-600">方形章</div>
          </CardContent>
        </Card>
      </div>

      {/* Seals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {seals.map((seal) => (
          <Card key={seal.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {renderSealPreview(seal)}
                  <div>
                    <CardTitle className="text-lg">{seal.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={seal.status === 'active' ? 'default' : 'secondary'}>
                        {seal.status === 'active' ? '启用' : '禁用'}
                      </Badge>
                      <Badge variant="outline">
                        {seal.type === 'circular' ? '圆形章' : '方形章'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm text-gray-600">
                {seal.description && (
                  <p className="line-clamp-2">{seal.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>创建时间: {seal.createdAt}</div>
                  <div>使用次数: {seal.usageCount}</div>
                  <div>最后使用: {seal.lastUsed || '未使用'}</div>
                  <div>大小: {seal.size}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewSeal(seal)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSeal(seal)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateSeal(seal)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportSeal(seal)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Switch
                    checked={seal.status === 'active'}
                    onCheckedChange={() => handleToggleStatus(seal.id)}
                    size="sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSeal(seal.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑印章</DialogTitle>
          </DialogHeader>
          <SealForm seal={newSeal} onChange={setNewSeal} isEdit={true} />
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateSeal} disabled={!newSeal.name}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>印章详情</DialogTitle>
          </DialogHeader>
          {selectedSeal && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {renderSealPreview(selectedSeal)}
              </div>
              <div className="space-y-2">
                <div><strong>名称:</strong> {selectedSeal.name}</div>
                <div><strong>类型:</strong> {selectedSeal.type === 'circular' ? '圆形章' : '方形章'}</div>
                <div><strong>状态:</strong> {selectedSeal.status === 'active' ? '启用' : '禁用'}</div>
                <div><strong>颜色:</strong> {selectedSeal.color}</div>
                <div><strong>大小:</strong> {selectedSeal.size}</div>
                <div><strong>边框宽度:</strong> {selectedSeal.borderWidth}px</div>
                <div><strong>字体大小:</strong> {selectedSeal.fontSize}px</div>
                <div><strong>创建时间:</strong> {selectedSeal.createdAt}</div>
                <div><strong>使用次数:</strong> {selectedSeal.usageCount}</div>
                <div><strong>最后使用:</strong> {selectedSeal.lastUsed || '未使用'}</div>
                {selectedSeal.description && (
                  <div><strong>描述:</strong> {selectedSeal.description}</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SealManagement

