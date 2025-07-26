from flask import Blueprint, request, jsonify
from src.models.user import db
import os
import json
from datetime import datetime

seals_bp = Blueprint('seals', __name__)

# 简单的印章存储
SEALS_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'seals')

def load_seals():
    """加载印章数据"""
    if os.path.exists(SEALS_FOLDER):
        with open(SEALS_FOLDER, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_seals(seals):
    """保存印章数据"""
    os.makedirs(os.path.dirname(SEALS_FOLDER), exist_ok=True)
    with open(SEALS_FOLDER, 'w', encoding='utf-8') as f:
        json.dump(seals, f, ensure_ascii=False, indent=2)

def save_seal_image(seal_id, image_file):
    """保存印章图片到 seals 文件夹，文件名为 id.png"""
    os.makedirs(SEALS_FOLDER, exist_ok=True)
    filename = f"{seal_id}.png"
    file_path = os.path.join(SEALS_FOLDER, filename)
    image_file.save(file_path)
    return file_path

@seals_bp.route('/seals', methods=['GET'])
def get_seals():
    """获取所有印章"""
    try:
        seals = load_seals()
        return jsonify({
            'success': True,
            'data': seals
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@seals_bp.route('/seals', methods=['POST'])
def create_seal():
    """创建新印章并保存图片"""
    try:
        data = request.form
        image_file = request.files.get('image')
        if not data or 'name' not in data:
            return jsonify({'success': False, 'message': '公司名称不能为空'}), 400
        if not image_file:
            return jsonify({'success': False, 'message': '请上传印章图片'}), 400

        seals = load_seals()
        new_seal_id = len(seals) + 1

        # 保存图片到 seals 文件夹
        image_path = save_seal_image(new_seal_id, image_file)

        new_seal = {
            'id': new_seal_id,
            'name': data['name'],
            'type': data.get('type', 'circular'),
            'createdAt': datetime.now().strftime('%Y-%m-%d'),
            'status': 'active',
            'imagePath': image_path
        }
        seals.append(new_seal)
        save_seals(seals)

        return jsonify({'success': True, 'data': new_seal, 'message': '印章创建成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@seals_bp.route('/seals/<int:seal_id>', methods=['GET'])
def get_seal(seal_id):
    """获取指定印章"""
    try:
        seals = load_seals()
        seal = next((s for s in seals if s['id'] == seal_id), None)
        
        if not seal:
            return jsonify({
                'success': False,
                'message': '印章不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'data': seal
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@seals_bp.route('/seals/<int:seal_id>', methods=['PUT'])
def update_seal(seal_id):
    """更新印章"""
    try:
        data = request.get_json()
        seals = load_seals()
        
        seal_index = next((i for i, s in enumerate(seals) if s['id'] == seal_id), None)
        
        if seal_index is None:
            return jsonify({
                'success': False,
                'message': '印章不存在'
            }), 404
        
        # 更新印章信息
        if 'name' in data:
            seals[seal_index]['name'] = data['name']
        if 'type' in data:
            seals[seal_index]['type'] = data['type']
        if 'status' in data:
            seals[seal_index]['status'] = data['status']
        
        save_seals(seals)
        
        return jsonify({
            'success': True,
            'data': seals[seal_index],
            'message': '印章更新成功'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@seals_bp.route('/seals/<int:seal_id>', methods=['DELETE'])
def delete_seal(seal_id):
    """删除印章"""
    try:
        seals = load_seals()
        
        seal_index = next((i for i, s in enumerate(seals) if s['id'] == seal_id), None)
        
        if seal_index is None:
            return jsonify({
                'success': False,
                'message': '印章不存在'
            }), 404
        
        deleted_seal = seals.pop(seal_index)
        save_seals(seals)
        
        return jsonify({
            'success': True,
            'data': deleted_seal,
            'message': '印章删除成功'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

