from flask import Blueprint, request, jsonify, send_file, current_app
import os
import uuid
from datetime import datetime
import json
import base64
from werkzeug.utils import secure_filename
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.pagesizes import letter
from io import BytesIO

files_bp = Blueprint('files', __name__)

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@files_bp.route('/upload', methods=['POST'])
def upload_files():
    """上传文件接口"""
    try:
        # 主合同上传
        if 'mainContract' in request.files:
            main_file = request.files['mainContract']
            if main_file.filename == '':
                return jsonify({'error': '未选择主合同文件'}), 400
            if not allowed_file(main_file.filename):
                return jsonify({'error': '不支持的文件格式，请上传PDF文件'}), 400
            main_file_id = str(uuid.uuid4())
            main_file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"{main_file_id}.pdf")
            main_file.save(main_file_path)
            main_file_info = {
                'id': main_file_id,
                'name': main_file.filename,
                'path': main_file_path,
                'size': os.path.getsize(main_file_path),
                'type': 'main',
                'uploadTime': datetime.now().isoformat()
            }
            return jsonify({
                'success': True,
                'mainContract': main_file_info,
                'message': '主合同文件上传成功'
            }), 200

        # 附件上传（支持单个或多个附件）
        if 'attachments' in request.files:
            attachment_files = request.files.getlist('attachments')
            saved_attachments = []
            for attachment in attachment_files:
                if attachment.filename != '' and allowed_file(attachment.filename):
                    att_file_id = str(uuid.uuid4())
                    att_file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"{att_file_id}.pdf")
                    attachment.save(att_file_path)
                    saved_attachments.append({
                        'id': att_file_id,
                        'name': attachment.filename,
                        'path': att_file_path,
                        'size': os.path.getsize(att_file_path),
                        'type': 'attachment',
                        'uploadTime': datetime.now().isoformat()
                    })
                else:
                    return jsonify({'error': f'附件文件格式错误或未选择文件: {getattr(attachment, "filename", "")}'}), 400
            return jsonify({
                'success': True,
                'attachments': saved_attachments,
                'message': '附件文件上传成功'
            }), 200

        return jsonify({'error': '未找到主合同文件或附件'}), 400

    except Exception as e:
        return jsonify({'error': f'文件上传失败: {str(e)}'}), 500

@files_bp.route('/merge', methods=['POST'])
def merge_files():
    """合并PDF文件接口"""
    try:
        data = request.get_json()
        main_file_id = data.get('mainFileId')
        attachment_ids = data.get('attachmentIds', [])
        
        if not main_file_id:
            return jsonify({'error': '缺少主合同文件ID'}), 400
        
        # 查找主合同文件
        upload_folder = current_app.config['UPLOAD_FOLDER']
        main_file_path = os.path.join(upload_folder, f"{main_file_id}.pdf")
        if not os.path.exists(main_file_path):
            return jsonify({'error': '主合同文件不存在'}), 404

        # 检查所有附件是否存在
        for attachment_id in attachment_ids:
            attachment_path = os.path.join(upload_folder, f"{attachment_id}.pdf")
            if not os.path.exists(attachment_path):
                return jsonify({'error': f'附件文件不存在: {attachment_id}'}), 404

        # 生成合并文件名和路径
        merged_file_id = str(uuid.uuid4())
        merged_filename = f"{merged_file_id}.pdf"
        merged_file_path = os.path.join(current_app.config['PROCESSED_FOLDER'], merged_filename)
        
        # 使用PyPDF2进行真实的PDF合并
        writer = PdfWriter()
        
        # 添加主合同页面
        with open(main_file_path, 'rb') as main_file:
            main_reader = PdfReader(main_file)
            for page in main_reader.pages:
                writer.add_page(page)
        
        # 添加附件页面
        for attachment_id in attachment_ids:
            attachment_path = os.path.join(upload_folder, f"{attachment_id}.pdf")
            with open(attachment_path, 'rb') as att_file:
                att_reader = PdfReader(att_file)
                for page in att_reader.pages:
                    writer.add_page(page)
        
        # 写入合并后的PDF文件
        with open(merged_file_path, 'wb') as merged_file:
            writer.write(merged_file)
        
        # 获取合并后文件信息
        merged_file_info = {
            'id': merged_file_id,
            'name': merged_filename,
            'path': merged_file_path,
            'size': os.path.getsize(merged_file_path),
            'type': 'merged',
            'mergedAt': datetime.now().isoformat(),
            'sourceFiles': [main_file_id] + attachment_ids
        }
        
        return jsonify({
            'success': True,
            'mergedFile': merged_file_info,
            'message': 'PDF文件合并成功'
        })
        
    except Exception as e:
        return jsonify({'error': f'文件合并失败: {str(e)}'}), 500

@files_bp.route('/apply-seal', methods=['POST'])
def apply_seal():
    """实际加盖印章到PDF文件"""
    try:
        data = request.get_json()
        file_id = data.get('fileId')
        seal_config = data.get('sealConfig')
        contract_info = data.get('contractInfo')

        if not file_id or not seal_config:
            return jsonify({'error': '缺少必要参数'}), 400

        # 参数解析
        page_num = int(seal_config.get('page', 1))
        x = float(seal_config.get('x', 0))
        y = float(seal_config.get('y', 0))
        seal_id = str(seal_config.get('sealId'))

        # 印章图片路径（假设印章图片已上传到指定目录，文件名为 sealId.png）
        seal_img_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"{seal_id}.png")
        if not os.path.exists(seal_img_path):
            return jsonify({'error': '印章图片不存在'}), 400

        # 查找合并后的PDF
        merged_pdf_path = None
        for folder in [current_app.config['PROCESSED_FOLDER'], current_app.config['UPLOAD_FOLDER']]:
            for filename in os.listdir(folder):
                if filename.startswith(file_id) or file_id in filename:
                    merged_pdf_path = os.path.join(folder, filename)
                    break
            if merged_pdf_path:
                break
        if not merged_pdf_path or not os.path.exists(merged_pdf_path):
            return jsonify({'error': '待签章PDF文件不存在'}), 404

        # 生成签章后文件名
        contract_number = contract_info.get('contractNumber', 'CONTRACT')
        counterparty = contract_info.get('counterparty', 'PARTNER')
        contract_name = contract_info.get('contractName', '合同')
        sealed_filename = f"{contract_number}-{counterparty}-{contract_name}.pdf"
        sealed_file_path = os.path.join(current_app.config['PROCESSED_FOLDER'], sealed_filename)
        sealed_file_id = str(uuid.uuid4())

        # 读取原PDF并加盖印章
        reader = PdfReader(merged_pdf_path)
        writer = PdfWriter()
        total_pages = len(reader.pages)
        if page_num < 1 or page_num > total_pages:
            return jsonify({'error': f'签章页码超出范围，当前文档共 {total_pages} 页'}), 400

        for i, page in enumerate(reader.pages, start=1):
            if i == page_num:
                # 生成印章overlay
                packet = BytesIO()
                can = canvas.Canvas(packet, pagesize=letter)
                can.drawImage(ImageReader(seal_img_path), x, y, width=100, height=100, mask='auto')
                can.save()
                packet.seek(0)
                overlay = PdfReader(packet)
                page.merge_page(overlay.pages[0])
            writer.add_page(page)

        with open(sealed_file_path, 'wb') as f:
            writer.write(f)

        sealed_file_info = {
            'id': sealed_file_id,
            'name': sealed_filename,
            'path': sealed_file_path,
            'size': os.path.getsize(sealed_file_path),
            'type': 'sealed',
            'sealedAt': datetime.now().isoformat(),
            'sealConfig': seal_config,
            'contractInfo': contract_info
        }

        return jsonify({
            'success': True,
            'sealedFile': sealed_file_info,
            'message': '印章应用成功'
        })

    except Exception as e:
        return jsonify({'error': f'印章应用失败: {str(e)}'}), 500

@files_bp.route('/rename', methods=['POST'])
def rename_file():
    """重命名文件"""
    try:
        data = request.get_json()
        
        required_fields = ['filePath', 'contractNumber', 'counterparty', 'contractName']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'缺少必要参数: {field}'}), 400
        
        file_path = data['filePath']
        contract_number = data['contractNumber']
        counterparty = data['counterparty']
        contract_name = data['contractName']
        
        # 生成新文件名：合同编号-签约对方简称-合同名
        new_filename = f"{contract_number}-{counterparty}-{contract_name}.pdf"
        new_path = os.path.join(os.path.dirname(file_path), new_filename)
        
        # 重命名文件
        os.rename(file_path, new_path)
        
        return jsonify({
            'success': True,
            'data': {
                'name': new_filename,
                'path': new_path
            },
            'message': '文件重命名成功'
        })
        
    except Exception as e:
        return jsonify({'error': f'文件重命名失败: {str(e)}'}), 500

@files_bp.route('/download/<file_id>')
def download_file(file_id):
    """下载文件接口"""
    try:
        # 在所有文件夹中查找文件
        folders = [
            current_app.config['UPLOAD_FOLDER'],
            current_app.config['PROCESSED_FOLDER']
        ]
        
        file_path = None
        filename = None
        
        for folder in folders:
            if os.path.exists(folder):
                for file in os.listdir(folder):
                    if file.startswith(file_id) or file_id in file:
                        file_path = os.path.join(folder, file)
                        filename = file
                        break
                if file_path:
                    break
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': '文件不存在'}), 404
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': f'文件下载失败: {str(e)}'}), 500

@files_bp.route('/preview/<file_id>')
def preview_file(file_id):
    """预览文件接口"""
    try:
        # 查找文件
        folders = [
            current_app.config['UPLOAD_FOLDER'],
            current_app.config['PROCESSED_FOLDER']
        ]
        
        file_path = None
        filename = None
        
        for folder in folders:
            if os.path.exists(folder):
                for file in os.listdir(folder):
                    if file.startswith(file_id) or file_id in file:
                        file_path = os.path.join(folder, file)
                        filename = file
                        break
                if file_path:
                    break
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': '文件不存在'}), 404
        
        # 返回文件信息和预览数据
        file_info = {
            'id': file_id,
            'name': filename,
            'size': os.path.getsize(file_path),
            'type': 'pdf',
            'pages': 5,  # 模拟页数
            'previewUrl': f'/api/files/view/{file_id}'
        }
        
        return jsonify({
            'success': True,
            'file': file_info
        })
        
    except Exception as e:
        return jsonify({'error': f'文件预览失败: {str(e)}'}), 500

@files_bp.route('/view/<file_id>')
def view_file(file_id):
    """直接查看PDF文件"""
    try:
        # 查找文件
        folders = [
            current_app.config['UPLOAD_FOLDER'],
            current_app.config['PROCESSED_FOLDER']
        ]
        
        file_path = None
        
        for folder in folders:
            if os.path.exists(folder):
                for file in os.listdir(folder):
                    if file.startswith(file_id) or file_id in file:
                        file_path = os.path.join(folder, file)
                        break
                if file_path:
                    break
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': '文件不存在'}), 404
        
        return send_file(
            file_path,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': f'文件查看失败: {str(e)}'}), 500

@files_bp.route('/compare', methods=['POST'])
def compare_files():
    """比较文件差异"""
    try:
        data = request.get_json()
        original_file_id = data.get('originalFileId')
        modified_file_id = data.get('modifiedFileId')
        
        if not original_file_id or not modified_file_id:
            return jsonify({'error': '缺少文件ID参数'}), 400
        
        # 模拟文件差异检测
        differences = [
            {
                'type': 'seal_added',
                'description': '添加了电子印章',
                'page': 1,
                'position': {'x': 450, 'y': 650},
                'timestamp': datetime.now().isoformat()
            },
            {
                'type': 'date_added',
                'description': '添加了签署日期',
                'page': 1,
                'position': {'x': 400, 'y': 700},
                'content': datetime.now().strftime('%Y-%m-%d'),
                'timestamp': datetime.now().isoformat()
            }
        ]
        
        return jsonify({
            'success': True,
            'differences': differences,
            'summary': {
                'totalChanges': len(differences),
                'hasSignificantChanges': False,
                'recommendApproval': True
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'文件比较失败: {str(e)}'}), 500

@files_bp.route('/list')
def list_files():
    """列出所有文件"""
    try:
        files = []
        folders = [
            ('upload', current_app.config['UPLOAD_FOLDER']),
            ('processed', current_app.config['PROCESSED_FOLDER'])
        ]
        
        for folder_type, folder_path in folders:
            if os.path.exists(folder_path):
                for filename in os.listdir(folder_path):
                    if filename.endswith('.pdf'):
                        file_path = os.path.join(folder_path, filename)
                        file_stat = os.stat(file_path)
                        
                        files.append({
                            'id': filename.split('_')[0] if '_' in filename else filename,
                            'name': filename,
                            'path': file_path,
                            'size': file_stat.st_size,
                            'type': folder_type,
                            'modifiedAt': datetime.fromtimestamp(file_stat.st_mtime).isoformat()
                        })
        
        return jsonify({
            'success': True,
            'files': files
        })
        
    except Exception as e:
        return jsonify({'error': f'获取文件列表失败: {str(e)}'}), 500

