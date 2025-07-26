import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Upload, FileText, Merge, Stamp, Download, Eye, Move } from 'lucide-react'
import PDFViewer from './PDFViewer'

function FileProcessing() {
  const [files, setFiles] = useState({
    mainContract: null,
    attachments: []
  })
  const [signedFile, setSignedFile] = useState(null)
  const [mergedFile, setMergedFile] = useState(null)
  const [contractInfo, setContractInfo] = useState({
    contractNumber: '',
    signDate: new Date().toISOString().split('T')[0],
    counterparty: '',
    contractName: '',
    signPage: 1,
    addRidingSeal: false
  })
  const [selectedSeal, setSelectedSeal] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [message, setMessage] = useState('')
  const [sealPosition, setSealPosition] = useState({ page: 1, x: 0, y: 0 })

  const mainContractRef = useRef()
  const attachmentsRef = useRef()

  // Mock seals data
  const availableSeals = [
    { id: 1, name: '示例科技有限公司', type: 'circular' },
    { id: 2, name: '上海集采汇', type: 'square' }
  ]

  // 新增：上传主合同文件到后端
  const uploadMainContract = async (file) => {
    const formData = new FormData()
    formData.append('mainContract', file) // 字段名必须和后端一致
    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('主合同上传失败')
      const data = await res.json()
      return data // 假设返回 { id, name, size, ... }
    } catch (err) {
      setMessage('主合同上传失败')
      return null
    }
  }

  // 新增：上传附件文件到后端
  const uploadAttachment = async (file) => {
    const formData = new FormData()
    formData.append('attachments', file) // 改为 attachments
    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('附件上传失败')
      const data = await res.json()
      return data
    } catch (err) {
      setMessage('附件上传失败')
      return null
    }
  }

  // 修改主合同上传逻辑
  const handleMainContractUpload = async (event) => {

    const file = event.target.files[0]
    if (file && file.type === 'application/pdf') {
      const uploaded = await uploadMainContract(file)
      if (uploaded && uploaded.success && uploaded.mainContract) {
        // 合并前端 file 的 name/size，保证 name 可用
        setFiles(prev => ({
          ...prev,
          mainContract: {
            ...uploaded.mainContract,
            name: uploaded.mainContract.name || file.name,
            size: uploaded.mainContract.size || file.size,
          }
        }))
        setCurrentStep(2)
      }
    }
  }

  // 修改附件上传逻辑
  const handleAttachmentsUpload = async (event) => {
    const newFiles = Array.from(event.target.files).filter(file => file.type === 'application/pdf')
    for (const file of newFiles) {
      const uploaded = await uploadAttachment(file)
      if (uploaded && uploaded.success && uploaded.attachments) {
        setFiles(prev => ({
          ...prev,
          attachments: [
            ...prev.attachments,
            ...uploaded.attachments.map(att => ({
              ...att,
              name: att.name || file.name,
              size: att.size || file.size,
            }))
          ]
        }))
      }
    }
  }

  const removeAttachment = (index) => {
    const newAttachments = files.attachments.filter((_, i) => i !== index)
    setFiles({ ...files, attachments: newAttachments })
  }

  const handleMergeFiles = async () => {
    if (!files.mainContract) return

    setIsProcessing(true)
    setUploadProgress(0)

    try {
      // 合并文件
      const res = await fetch('/api/files/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainFileId: files.mainContract.id,
          attachmentIds: files.attachments.map(file => file.id),
        }),
      })
      if (!res.ok) throw new Error('合并失败')
      const data = await res.json()
      if (data.success && data.mergedFile) {
        setMergedFile(data.mergedFile)
        setMessage('合并成功，正在识别盖章位置...')
        // 合并成功后，调用AI识别接口
        // const aiRes = await fetch('/api/files/ai-seal-position', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ fileId: data.mergedFile.id }),
        // })
        // const aiData = await aiRes.json()
        // // aiData: { page, x, y }
        // if (aiData.success && aiData.position) {
        //   setSealPosition(aiData.position)
        //   setCurrentStep(3)
        //   setMessage('AI已识别盖章位置，请确认或拖动微调')
        // } else {
        setCurrentStep(3)
        //   setMessage('AI未识别到盖章位置，请手动设置')
        // }
      } else {
        setMessage(data.error || '合并失败')
      }
    } catch (err) {
      setMessage('合并失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }



  const handleApplySignature = async () => {
    if (!mergedFile || !selectedSeal) return

    setIsProcessing(true)
    setMessage('正在加盖签章...')

    try {
      const res = await fetch('/api/files/apply-seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: mergedFile.id,
          sealConfig: {
            sealId: selectedSeal,
            page: sealPosition.page,
            x: sealPosition.x,
            y: sealPosition.y,
          },
          contractInfo,
        }),
      })
      const data = await res.json()
      if (data.success && data.sealedFile) {
        setSignedFile(data.sealedFile)
        setCurrentStep(4)
        setMessage('加盖签章成功')
      } else {
        setMessage(data.error || '加盖签章失败')
      }
    } catch (err) {
      setMessage('加盖签章失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }

  const generateFileName = () => {
    const { contractNumber, counterparty, contractName } = contractInfo
    if (contractNumber && counterparty && contractName) {
      return `${contractNumber}${counterparty}${contractName}.pdf`
    }
    return '签章后文件.pdf'
  }
  const handleDownloadMerged = async () => {
    if (!mergedFile) return
    
    try {
      // 直接使用文件ID进行下载
      const response = await fetch(`/api/files/download/${mergedFile.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      })
      
      if (!response.ok) {
        throw new Error('下载失败')
      }
      
      // 获取文件blob
      const blob = await response.blob()
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = mergedFile.name || 'merged_contract.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setMessage('合并文件下载成功')
    } catch (error) {
      console.error('下载失败:', error)
      setMessage('下载失败，请重试')
    }
  }

  const handleDownloadFinal = async () => {
    if (!signedFile) return
    
    try {
      // 直接使用文件ID进行下载
      const response = await fetch(`/api/files/download/${signedFile.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      })
      
      if (!response.ok) {
        throw new Error('下载失败')
      }
      
      // 获取文件blob
      const blob = await response.blob()
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = signedFile.name || 'signed_contract.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setMessage('签章文件下载成功')
    } catch (error) {
      console.error('下载失败:', error)
      setMessage('下载失败，请重试')
    }
  }

  const steps = [
    { id: 1, title: '上传文件', description: '上传主合同和附件' },
    { id: 2, title: '合并预览', description: '将文件合并预览' },
    { id: 3, title: '加盖签章', description: '选择印章并设置位置' },
    { id: 4, title: '完成下载', description: '生成最终文件' }
  ]

  // Determine which file to show in preview - 只在合并后显示预览
  const getPreviewFile = () => {
    if (signedFile) return signedFile
    if (mergedFile) return mergedFile
    return null  // 只有合并后才显示预览
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>签章流程</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {step.id}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Controls */}
        <div className="space-y-6">
          {/* Step 1: File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>1. 文件上传</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="mainContract">主合同文件 (PDF)</Label>
                <div className="mt-1">
                  <input
                    ref={mainContractRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleMainContractUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => mainContractRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    选择主合同文件
                  </Button>
                  {files.mainContract && (
                    <div className="mt-2 p-2 bg-green-50 rounded-md">
                      <p className="text-sm text-green-700">{files.mainContract.name}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="attachments">附件文件 (PDF, 可多选)</Label>
                <div className="mt-1">
                  <input
                    ref={attachmentsRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleAttachmentsUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => attachmentsRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    选择附件文件
                  </Button>
                  {files.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {files.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                          <span className="text-sm text-blue-700">{file.name}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeAttachment(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: File Merge */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Merge className="h-5 w-5" />
                <span>2. 合并预览</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleMergeFiles}
                disabled={!files.mainContract || isProcessing}
                className="w-full"
              >
                <Merge className="h-4 w-4 mr-2" />
                合并预览
              </Button>
              
              {isProcessing && currentStep === 2 && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-gray-600 mt-1">正在合并文档... {uploadProgress}%</p>
                </div>
              )}
              
              {mergedFile && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-green-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">{mergedFile.name}</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      文件大小: {(mergedFile.size / 1024 / 1024).toFixed(2)} MB | 页数: {mergedFile.pages}
                    </p>
                  </div>
                  
                  {/* Download Merged File Button */}
                  <Button 
                    onClick={handleDownloadMerged}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下载合并后文件
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Contract Info & Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Stamp className="h-5 w-5" />
                <span>3. 签章设置</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractNumber">合同编号</Label>
                  <Input
                    id="contractNumber"
                    placeholder="如：ZS-202504PO-213"
                    value={contractInfo.contractNumber}
                    onChange={(e) => setContractInfo({ ...contractInfo, contractNumber: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="signDate">签署日期</Label>
                  <Input
                    id="signDate"
                    type="date"
                    value={contractInfo.signDate}
                    onChange={(e) => setContractInfo({ ...contractInfo, signDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="counterparty">签约对方简称</Label>
                  <Input
                    id="counterparty"
                    placeholder="如：上海集采汇"
                    value={contractInfo.counterparty}
                    onChange={(e) => setContractInfo({ ...contractInfo, counterparty: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contractName">合同名称</Label>
                  <Input
                    id="contractName"
                    placeholder="如：采购合同"
                    value={contractInfo.contractName}
                    onChange={(e) => setContractInfo({ ...contractInfo, contractName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sealSelect">选择印章</Label>
                  <Select value={selectedSeal} onValueChange={setSelectedSeal}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择印章" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSeals.map((seal) => (
                        <SelectItem key={seal.id} value={seal.id.toString()}>
                          {seal.name} ({seal.type === 'circular' ? '圆形章' : '方形章'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="signPage">签章页码</Label>
                  <Input
                    id="signPage"
                    type="number"
                    min="1"
                    value={contractInfo.signPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value) || 1
                      setContractInfo({ ...contractInfo, signPage: page })
                      setSealPosition(pos => ({ ...pos, page })) // 只同步 sealPosition.page
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ridingSeal"
                  checked={contractInfo.addRidingSeal}
                  onCheckedChange={(checked) => setContractInfo({ ...contractInfo, addRidingSeal: checked })}
                />
                <Label htmlFor="ridingSeal">添加骑缝章</Label>
              </div>

              <Button 
                onClick={handleApplySignature}
                disabled={!mergedFile || !selectedSeal || isProcessing}
                className="w-full"
              >
                <Stamp className="h-4 w-4 mr-2" />
                {isProcessing && currentStep === 3 ? '正在加盖签章...' : '加盖签章'}
              </Button>
            </CardContent>
          </Card>

          {/* Step 4: Download */}
          {currentStep >= 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>4. 文件下载</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm font-medium text-blue-900">生成的文件名:</p>
                  <p className="text-sm text-blue-700 mt-1">{generateFileName()}</p>
                </div>
                
                <Button onClick={handleDownloadFinal} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  下载签章后文件
                </Button>
                
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    检测差异
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - PDF Viewer */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>文档预览</span>
                {currentStep >= 3 && (
                  <Badge variant="secondary" className="ml-auto">
                    <Move className="h-3 w-3 mr-1" />
                    可拖动签章
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PDFViewer
                file={getPreviewFile()}
                canDragSeal={currentStep >= 3}
                selectedSeal={selectedSeal}
                onSealPositionChange={setSealPosition}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default FileProcessing

