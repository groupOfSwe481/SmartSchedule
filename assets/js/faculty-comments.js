// assets/js/faculty-comments.js
// Committee Members Comment Management System

class FacultyCommentManager {
    constructor() {
        this.comments = [];
        this.currentFilter = 'all';
        this.currentLevel = null;
        this.userData = null;
        this.apiBase = 'http://localhost:4000/api';
    }

    init() {
        const userStr = sessionStorage.getItem('user');
        
        if (!userStr) {
            console.warn('⚠️ No user data found. FAKING user for testing.');
            
            // ✅ ميزة المستخدم الوهمي للتجربة
            this.userData = {
                id: 'TEST_USER_ID',
                _id: 'TEST_USER_ID',
                First_Name: 'Test',
                Last_Name: 'User (Testing)'
            };
            console.log('✅ Faked user data for testing:', this.userData);

        } else {
            try {
                this.userData = JSON.parse(userStr);
                console.log('✅ Faculty comment manager initialized with real user');
            } catch (error) {
                console.error('❌ Error parsing user data:', error);
                this.userData = null;
            }
        }
        
        this.setupEventListeners();
        console.log('✅ Faculty comment manager listeners attached.');
    }

    setupEventListeners() {
        // View All Comments button
        const viewCommentsBtn = document.querySelector('[data-action="view-comments"]');
        if (viewCommentsBtn) {
            viewCommentsBtn.addEventListener('click', () => {
                this.openCommentsModal();
            });
        }
    }

    /**
     * Open comments modal and load all comments
     */
    async openCommentsModal() {
        this.createCommentsModal();
        
        const modal = new bootstrap.Modal(document.getElementById('commentsManagementModal'));
        modal.show();

        await this.loadAllComments();
    }

    /**
     * Create the comments management modal HTML
     */
    createCommentsModal() {
        if (document.getElementById('commentsManagementModal')) {
            return;
        }

        const modalHTML = `
            <div class="modal fade" id="commentsManagementModal" tabindex="-1">
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="bi bi-chat-dots"></i> Student & Faculty Comments Management
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-3">
                                    <label class="form-label fw-bold">Filter by Level</label>
                                    <select class="form-select" id="commentLevelFilter" onchange="facultyComments.filterByLevel(this.value)">
                                        <option value="all">All Levels</option>
                                        <option value="3">Level 3</option>
                                        <option value="4">Level 4</option>
                                        <option value="5">Level 5</option>
                                        <option value="6">Level 6</option>
                                        <option value="7">Level 7</option>
                                        <option value="8">Level 8</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold">Filter by Status</label>
                                    <select class="form-select" id="commentStatusFilter" onchange="facultyComments.filterByStatus(this.value)">
                                        <option value="all">All Status</option>
                                        <option value="pending">⏳ Pending</option>
                                        <option value="reviewed">👀 Reviewed</option>
                                        <option value="resolved">✅ Resolved</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold">Filter by Type</label>
                                    <select class="form-select" id="commentTypeFilter" onchange="facultyComments.filterByType(this.value)">
                                        <option value="all">All Comments</option>
                                        <option value="student">👨‍🎓 Student Comments</option>
                                        <option value="faculty">👨‍🏫 Faculty Comments</option>
                                        <option value="committee">👥 Load Committee</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-bold">Statistics</label>
                                    <div class="d-flex gap-2 flex-wrap" id="commentStats">
                                        <span class="badge bg-warning">0 Pending</span>
                                        <span class="badge bg-info">0 Reviewed</span>
                                        <span class="badge bg-success">0 Resolved</span>
                                    </div>
                                </div>
                            </div>

                            <div id="commentsListContainer" style="max-height: 500px; overflow-y: auto;">
                                <div class="text-center py-3">
                                    <div class="spinner-border spinner-border-sm me-2"></div>
                                    Loading comments...
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="facultyComments.exportComments()">
                                <i class="bi bi-download"></i> Export to CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="commentDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Comment Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="commentDetailBody">
                            </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Load all comments from API
     */
    async loadAllComments() {
        const container = document.getElementById('commentsListContainer');
        if (!container) return;

        try {
            const token = sessionStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`; 
            }

            console.log('📡 Fetching comments from:', `${this.apiBase}/comments/all`);

            const response = await fetch(`${this.apiBase}/comments/all?limit=500`, {
                headers: headers
            });

            const data = await response.json();

            if (response.ok) {
                this.comments = data.data || [];
                console.log('✅ Loaded comments:', this.comments.length);
                this.updateStatistics(data.stats);
                this.renderComments();
            } else {
                throw new Error(data.error || 'Failed to load comments');
            }
        } catch (error) {
            console.error('❌ Error loading comments:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> Failed to load comments: ${error.message}
                </div>
            `;
        }
    }

    /**
     * ✅ تحديد نوع التعليق
     */
    getCommentType(studentId) {
        if (studentId.startsWith('COMMITTEE_')) {
            return 'committee';
        } else if (studentId.startsWith('FACULTY_')) {
            return 'faculty';
        } else {
            return 'student';
        }
    }

    /**
     * Render comments list
     */
    renderComments() {
        const container = document.getElementById('commentsListContainer');
        if (!container) return;

        let filteredComments = this.comments;

        // Apply level filter
        if (this.currentLevel && this.currentLevel !== 'all') {
            filteredComments = filteredComments.filter(c => 
                c.student_level === parseInt(this.currentLevel)
            );
        }

        // Apply status filter
        if (this.currentFilter !== 'all') {
            filteredComments = filteredComments.filter(c => 
                c.status === this.currentFilter
            );
        }

        // Apply type filter (student vs faculty vs committee)
        const typeFilter = document.getElementById('commentTypeFilter')?.value || 'all';
        if (typeFilter === 'student') {
            filteredComments = filteredComments.filter(c => 
                !c.student_id.startsWith('FACULTY_') && !c.student_id.startsWith('COMMITTEE_')
            );
        } else if (typeFilter === 'faculty') {
            filteredComments = filteredComments.filter(c => 
                c.student_id.startsWith('FACULTY_')
            );
        } else if (typeFilter === 'committee') {
            filteredComments = filteredComments.filter(c => 
                c.student_id.startsWith('COMMITTEE_')
            );
        }

        if (filteredComments.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="bi bi-inbox"></i> No comments found matching your filters
                </div>
            `;
            return;
        }

        let html = '<div class="list-group">';
        
        filteredComments.forEach(comment => {
            const statusBadge = this.getStatusBadge(comment.status);
            const statusClass = this.getStatusClass(comment.status);
            
            // تحديد نوع المعلق
            const commentType = this.getCommentType(comment.student_id);
            let typeBadge = '';
            
            if (commentType === 'student') {
                typeBadge = '<span class="badge bg-primary">👨‍🎓 Student</span>';
            } else if (commentType === 'faculty') {
                typeBadge = '<span class="badge bg-secondary">👨‍🏫 Faculty</span>';
            } else if (commentType === 'committee') {
                typeBadge = '<span class="badge bg-info">👥 Load Committee</span>';
            }
            
            const date = new Date(comment.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <div class="list-group-item ${statusClass}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <h6 class="mb-1">
                                ${typeBadge}
                                <span class="badge bg-secondary">Level ${comment.student_level}</span>
                                ${comment.student_name}
                            </h6>
                            <div class="text-primary fw-bold">
                                ${comment.course_code} - ${comment.course_name}
                            </div>
                            <small class="text-muted">${comment.day}, ${comment.time_slot}</small>
                        </div>
                        <div class="text-end">
                            ${statusBadge}
                            <br><small class="text-muted">${date}</small>
                        </div>
                    </div>
                    <p class="mb-2">${comment.comment_text}</p>
                    
                    ${comment.procedures ? `
                        <div class="alert alert-info py-2 mb-2">
                            <strong>🛠️ Procedures:</strong> ${comment.procedures}
                        </div>
                    ` : ''}

                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-sm" onclick="facultyComments.viewDetail('${comment._id}')">
                            <i class="bi bi-eye"></i> View
                        </button>
                        ${comment.status === 'pending' ? `
                            <button class="btn btn-outline-info btn-sm" onclick="facultyComments.markAsReviewed('${comment._id}')">
                                <i class="bi bi-check"></i> Mark Reviewed
                            </button>
                        ` : ''}
                        ${comment.status !== 'resolved' ? `
                            <button class="btn btn-outline-success btn-sm" onclick="facultyComments.resolveComment('${comment._id}')">
                                <i class="bi bi-check-circle"></i> Resolve
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-danger btn-sm" onclick="facultyComments.deleteComment('${comment._id}')">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Update statistics display
     */
    updateStatistics(stats) {
        const statsContainer = document.getElementById('commentStats');
        if (!statsContainer || !stats) return;

        const pending = stats.by_status?.pending || 0;
        const reviewed = stats.by_status?.reviewed || 0;
        const resolved = stats.by_status?.resolved || 0;

        statsContainer.innerHTML = `
            <span class="badge bg-warning">${pending} Pending</span>
            <span class="badge bg-info">${reviewed} Reviewed</span>
            <span class="badge bg-success">${resolved} Resolved</span>
        `;
    }

    /**
     * Filter by level
     */
    async filterByLevel(level) {
        this.currentLevel = level;
        this.renderComments();
    }

    /**
     * Filter by status
     */
    async filterByStatus(status) {
        this.currentFilter = status;
        this.renderComments();
    }

    /**
     * Filter by type
     */
    async filterByType(type) {
        // Just trigger re-render
        this.renderComments();
    }

    /**
     * View comment details
     */
    viewDetail(commentId) {
        const comment = this.comments.find(c => c._id === commentId);
        if (!comment) return;

        let modal = bootstrap.Modal.getInstance(document.getElementById('commentDetailModal'));
        if (!modal) {
            modal = new bootstrap.Modal(document.getElementById('commentDetailModal'));
        }
        
        const body = document.getElementById('commentDetailBody');

        const statusBadge = this.getStatusBadge(comment.status);
        const date = new Date(comment.created_at).toLocaleString('en-US');
        
        const commentType = this.getCommentType(comment.student_id);
        let typeLabel = '';
        if (commentType === 'student') {
            typeLabel = '👨‍🎓 Student';
        } else if (commentType === 'faculty') {
            typeLabel = '👨‍🏫 Faculty Member';
        } else if (commentType === 'committee') {
            typeLabel = '👥 Load Committee Member';
        }

        body.innerHTML = `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6>${typeLabel} Information</h6>
                    ${statusBadge}
                </div>
                <p class="mb-1"><strong>Name:</strong> ${comment.student_name}</p>
                <p class="mb-1"><strong>ID:</strong> ${comment.student_id}</p>
                <p class="mb-0"><strong>Level:</strong> ${comment.student_level}</p>
            </div>

            <div class="mb-3">
                <h6>Course Information</h6>
                <p class="mb-1"><strong>Course:</strong> ${comment.course_code} - ${comment.course_name}</p>
                <p class="mb-0"><strong>Time:</strong> ${comment.day}, ${comment.time_slot}</p>
            </div>

            <div class="mb-3">
                <h6>Comment</h6>
                <div class="alert alert-light p-3">${comment.comment_text}</div>
                <small class="text-muted">Submitted: ${date}</small>
            </div>

            ${comment.procedures ? `
                <div class="mb-3">
                    <h6>Procedures Taken</h6>
                    <div class="alert alert-info p-3">${comment.procedures}</div>
                </div>
            ` : ''}

            ${comment.status !== 'resolved' ? `
                <hr>
                
                <div class="mb-3">
                    <label class="form-label fw-bold">Add / Edit Procedures</label>
                    <textarea class="form-control" id="adminProcedures_${commentId}" rows="4" placeholder="Describe the procedures taken...">${comment.procedures || ''}</textarea>
                </div>
                
                <div class="d-grid gap-2">
                    <button class="btn btn-info" onclick="facultyComments.markAsReviewed('${commentId}', document.getElementById('adminProcedures_${commentId}').value)">
                        <i class="bi bi-check"></i> Save and Mark as Reviewed
                    </button>
                    <button class="btn btn-success" onclick="facultyComments.resolveComment('${commentId}', document.getElementById('adminProcedures_${commentId}').value)">
                        <i class="bi bi-check-circle"></i> Save and Resolve Comment
                    </button>
                </div>
            ` : ''}
        `;

        modal.show();
    }

    /**
     * Mark comment as reviewed
     */
    // ✅ تعديل: استقبال procedures فقط
    async markAsReviewed(commentId, procedures = '') {
        await this.updateCommentStatus(commentId, 'reviewed', procedures);
    }

    /**
     * Resolve comment
     */
    // ✅ تعديل: استقبال procedures فقط
    async resolveComment(commentId, procedures = '') {
        await this.updateCommentStatus(commentId, 'resolved', procedures);
    }

    /**
     * Update comment status
     */
    // ✅ تعديل: استقبال procedures فقط
    async updateCommentStatus(commentId, status, procedures = '') {
        if (!this.userData) {
            alert('❌ يجب تسجيل الدخول لتنفيذ هذا الإجراء');
            return;
        }
        
        try {
            const payload = {
                status: status,
                reviewed_by: this.userData.id || this.userData._id 
            };

            // ✅ إزالة payload.admin_response

            // ✅ إضافة الإجراءات للـ payload
            if (procedures && procedures.trim()) {
                payload.procedures = procedures.trim();
            } else {
                 payload.procedures = ''; // للسماح بالحفظ كقيمة فارغة
            }

            const apiResponse = await fetch(`${this.apiBase}/comments/${commentId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await apiResponse.json();

            if (apiResponse.ok) {
                alert(`✅ Comment status updated to ${status}`);
                
                await this.loadAllComments(); // تحديث القائمة في الخلفية
                this.viewDetail(commentId); // تحديث المودال المفتوح
                
            } else {
                throw new Error(data.error || 'Failed to update comment');
            }
        } catch (error) {
            console.error('❌ Error updating comment:', error);
            alert('❌ Failed to update comment: ' + error.message);
        }
    }

    /**
     * Delete comment
     */
    async deleteComment(commentId) {
        if (!this.userData) {
            alert('❌ يجب تسجيل الدخول لتنفيذ هذا الإجراء');
            return;
        }

        if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
            return;
        }

        try {
            console.log('🗑️ Deleting comment:', commentId);
            
            const response = await fetch(`${this.apiBase}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            });

            console.log('📥 Delete response status:', response.status);

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                
                if (response.ok) {
                    alert('✅ Comment deleted successfully');
                    await this.loadAllComments();
                } else {
                    throw new Error(data.error || 'Failed to delete comment');
                }
            } else {
                const text = await response.text();
                console.error('❌ Received HTML instead of JSON:', text.substring(0, 200));
                throw new Error('Server returned HTML instead of JSON. Check backend route.');
            }
        } catch (error) {
            console.error('❌ Error deleting comment:', error);
            alert('❌ Failed to delete comment: ' + error.message);
        }
    }

    /**
     * Export comments to CSV
     */
    exportComments() {
        if (this.comments.length === 0) {
            alert('No comments to export');
            return;
        }

        // ✅ إزالة "Response" من الهيدر
        let csv = 'Type,Name,ID,Level,Course Code,Course Name,Day,Time,Comment,Status,Procedures,Created At\n';
        
        this.comments.forEach(comment => {
            const type = this.getCommentType(comment.student_id);
            let typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
            
            const row = [
                typeLabel,
                comment.student_name,
                comment.student_id,
                comment.student_level,
                comment.course_code,
                comment.course_name,
                comment.day,
                comment.time_slot,
                `"${comment.comment_text.replace(/"/g, '""')}"`,
                comment.status,
                // ✅ إزالة "admin_response" من الصف
                comment.procedures ? `"${comment.procedures.replace(/"/g, '""')}"` : '', // الإبقاء على procedures
                new Date(comment.created_at).toLocaleString()
            ];
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schedule_comments_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        alert('✅ Comments exported successfully!');
    }

    /**
     * Helper functions
     */
    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge bg-warning">⏳ Pending</span>',
            'reviewed': '<span class="badge bg-info">👀 Reviewed</span>',
            'resolved': '<span class="badge bg-success">✅ Resolved</span>'
        };
        return badges[status] || '';
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'border-warning border-start border-3',
            'reviewed': 'border-info border-start border-3',
            'resolved': 'border-success border-start border-3'
        };
        return classes[status] || '';
    }
}

// Initialize
const facultyComments = new FacultyCommentManager();
document.addEventListener('DOMContentLoaded', () => {
    facultyComments.init();
});

// Make available globally
window.facultyComments = facultyComments;

console.log('✅ faculty-comments.js loaded');
