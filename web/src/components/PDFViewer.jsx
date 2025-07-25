import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react'

function PDFViewer({ file, canDragSeal, selectedSeal, onSealPositionChange }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [sealPosition, setSealPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageRendering, setPageRendering] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const canvasRef = useRef()
  const viewerRef = useRef()

  useEffect(() => {
    if (file) {
      loadPDF(file)
    }
  }, [file])

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage)
    }
  }, [pdfDoc, currentPage, zoom])

  // 新增：每次 sealPosition 或 currentPage 变化时，通知父组件
  useEffect(() => {
    if (onSealPositionChange) {
      onSealPositionChange({
        page: currentPage,
        x: sealPosition.x,
        y: sealPosition.y,
      })
    }
  }, [sealPosition, currentPage, onSealPositionChange])

  const loadPDF = async (file) => {
    try {
      let fileUrl = null
      
      // 如果是File对象，创建URL
      if (file instanceof File) {
        fileUrl = URL.createObjectURL(file)
        setPdfUrl(fileUrl)
      } else if (file.id) {
        // 如果是后端返回的文件对象，使用API获取文件
        fileUrl = `/api/files/view/${file.id}`
        setPdfUrl(fileUrl)
      }
      
      if (fileUrl) {
        // 动态加载PDF.js
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = async () => {
          try {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            
            const loadingTask = window.pdfjsLib.getDocument(fileUrl)
            const pdf = await loadingTask.promise
            
            setPdfDoc(pdf)
            setTotalPages(pdf.numPages)
            setCurrentPage(1)
          } catch (error) {
            console.error('PDF加载失败:', error)
            // 如果PDF.js加载失败，显示占位内容
            setTotalPages(file.pages || 5)
            renderPlaceholder()
          }
        }
        script.onerror = () => {
          console.error('PDF.js脚本加载失败')
          setTotalPages(file.pages || 5)
          renderPlaceholder()
        }
        
        // 检查是否已经加载了PDF.js
        if (window.pdfjsLib) {
          script.onload()
        } else {
          document.head.appendChild(script)
        }
      }
    } catch (error) {
      console.error('文件读取失败:', error)
      setTotalPages(file.pages || 5)
      renderPlaceholder()
    }
  }

  const renderPage = async (pageNum) => {
    if (!pdfDoc || pageRendering) return
    
    setPageRendering(true)
    
    try {
      const page = await pdfDoc.getPage(pageNum)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      const viewport = page.getViewport({ scale: zoom / 100 })
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
    } catch (error) {
      console.error('页面渲染失败:', error)
      // 如果渲染失败，显示占位内容
      renderPlaceholder()
    }
    
    setPageRendering(false)
  }

  const renderPlaceholder = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const context = canvas.getContext('2d')
    canvas.width = 600
    canvas.height = 800
    
    // 绘制白色背景
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    
    // 绘制边框
    context.strokeStyle = '#e5e7eb'
    context.lineWidth = 2
    context.strokeRect(0, 0, canvas.width, canvas.height)
    
    // 绘制页面内容模拟
    context.fillStyle = '#374151'
    context.font = '16px Arial'
    context.textAlign = 'center'
    context.fillText(`第 ${currentPage} 页`, canvas.width / 2, 50)
    
    // 绘制模拟文档内容
    context.textAlign = 'left'
    context.font = '14px Arial'
    context.fillStyle = '#6b7280'
    
    const lines = [
      '合同编号：ZS-202504PO-213',
      '签署日期：2025年01月21日',
      '',
      '甲方：示例科技有限公司',
      '乙方：上海集采汇',
      '',
      '根据《中华人民共和国合同法》及相关法律法规，',
      '甲乙双方本着平等、自愿、公平、诚实信用的原则，',
      '就以下事项达成一致，签订本合同：',
      '',
      '第一条 合同标的',
      '1.1 甲方向乙方提供...',
      '1.2 服务内容包括...',
      '',
      '第二条 合同金额',
      '2.1 合同总金额为人民币...',
      '2.2 付款方式...',
      '',
      '第三条 履行期限',
      '3.1 合同履行期限为...',
      '3.2 交付时间...'
    ]
    
    let y = 100
    lines.forEach(line => {
      if (line === '') {
        y += 10
      } else {
        context.fillText(line, 50, y)
        y += 25
      }
    })
    
    // 在底部绘制页码信息
    context.font = '12px Arial'
    context.fillStyle = '#9ca3af'
    context.textAlign = 'center'
    context.fillText(`- ${currentPage} -`, canvas.width / 2, canvas.height - 30)
    
    if (file) {
      context.fillText(file.name || '文档预览', canvas.width / 2, canvas.height - 10)
    }
  }

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 25, 50))
  }

  const handlePrevPage = () => {
    setCurrentPage(Math.max(currentPage - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage(Math.min(currentPage + 1, totalPages))
  }

  const handleMouseDown = (e) => {
    if (canDragSeal && selectedSeal) {
      setIsDragging(true)
      const rect = viewerRef.current.getBoundingClientRect()
      setSealPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && canDragSeal && selectedSeal) {
      const rect = viewerRef.current.getBoundingClientRect()
      setSealPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 清理URL对象
  useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  if (!file) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📄</div>
          <p>请先上传PDF文件</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {currentPage} / {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom === 50}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom === 200}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div 
        ref={viewerRef}
        className="relative bg-white border rounded-lg"
        style={{ height: '800px', width: '100%' }}  // 增大预览区域
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* PDF Canvas */}
        <div className="flex justify-center items-center h-full p-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="shadow-lg border max-w-full max-h-full"
              style={{ 
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center'
              }}
            />
            
            {/* Draggable Seal */}
            {canDragSeal && selectedSeal && (
              <div
                className="absolute w-16 h-16 border-2 border-red-600 rounded-full flex items-center justify-center text-red-600 font-bold text-xs bg-red-50 cursor-move"
                style={{
                  left: Math.max(0, Math.min(sealPosition.x - 32, (canvasRef.current?.width || 600) - 64)),
                  top: Math.max(0, Math.min(sealPosition.y - 32, (canvasRef.current?.height || 800) - 64)),
                  opacity: 0.8,
                  transform: `scale(${zoom / 100})`
                }}
              >
                印章
              </div>
            )}
          </div>
        </div>
        
        {pageRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">正在渲染页面...</p>
            </div>
          </div>
        )}
      </div>

      {/* File Info */}
      <Card>
        <CardContent className="p-3">
          <div className="text-sm text-gray-600">
            <p className="font-medium">文件信息:</p>
            <div className="mt-1 space-y-1 text-xs">
              <div>文件名: {file.name || file.filename || '未知文件'}</div>
              {file.size && <div>大小: {(file.size / 1024 / 1024).toFixed(2)} MB</div>}
              <div>页数: {totalPages}</div>
              <div>当前页: {currentPage}</div>
              {canDragSeal && selectedSeal && (
                <div className="text-blue-600">
                  <div>印章位置: X: {Math.round(sealPosition.x)}, Y: {Math.round(sealPosition.y)}</div>
                  <div>💡 在PDF上点击并拖动来放置印章</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PDFViewer

