document.addEventListener('DOMContentLoaded', () => {
    // Data Store
    let students = JSON.parse(localStorage.getItem('students')) || [];
    let attendanceRecords = JSON.parse(localStorage.getItem('attendance')) || [];

    // Initial Sample Data
    if (students.length === 0) {
        students = [
            { id: 'S101', name: 'John Doe', gender: 'Male', class: '10-A' },
            { id: 'S102', name: 'Jane Smith', gender: 'Female', class: '10-A' },
            { id: 'S103', name: 'Mike Johnson', gender: 'Male', class: '10-B' },
            { id: 'S104', name: 'Sara Williams', gender: 'Female', class: '10-B' },
            { id: 'S105', name: 'Chris Brown', gender: 'Male', class: '10-A' },
        ];
        saveToLocalStorage();
    }

    function saveToLocalStorage() {
        localStorage.setItem('students', JSON.stringify(students));
        localStorage.setItem('attendance', JSON.stringify(attendanceRecords));
    }

    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(item.dataset.target).classList.add('active');

            if (item.dataset.target === 'dashboard') updateDashboard();
            if (item.dataset.target === 'manage-students') renderStudents();
            if (item.dataset.target === 'reports') {
                // Clear reports on enter
                document.getElementById('reportResults').innerHTML = '';
            }
        });
    });

    // Dashboard Logic
    function updateDashboard() {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = attendanceRecords.filter(r => r.date === today);

        const total = students.length;
        const present = todayRecords.filter(r => r.status === 'Present').length;
        const absent = todayRecords.filter(r => r.status === 'Absent').length;
        const late = todayRecords.filter(r => r.status === 'Late').length;

        document.getElementById('statTotalStudents').innerText = total;
        document.getElementById('statPresentToday').innerText = present;
        document.getElementById('statAbsentToday').innerText = absent;
        document.getElementById('statLateToday').innerText = late;

        const overallPerc = total === 0 ? 0 : Math.round((attendanceRecords.filter(r => r.status === 'Present').length / (attendanceRecords.length || 1)) * 100);
        document.getElementById('overallPercentage').innerText = `${overallPerc}%`;
    }

    // Student Management
    const studentModal = document.getElementById('studentModal');
    const studentForm = document.getElementById('studentForm');
    const openStudentModalBtn = document.getElementById('openStudentModal');
    const closeModalBtn = document.getElementById('closeModal');

    openStudentModalBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').innerText = 'Add New Student';
        studentForm.reset();
        document.getElementById('editStudentId').value = '';
        studentModal.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => {
        studentModal.style.display = 'none';
    });

    studentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('stuId').value;
        const name = document.getElementById('stuName').value;
        const gender = document.getElementById('stuGender').value;
        const className = document.getElementById('stuClass').value;
        const editId = document.getElementById('editStudentId').value;

        if (editId) {
            const index = students.findIndex(s => s.id === editId);
            students[index] = { id, name, gender, class: className };
        } else {
            if (students.some(s => s.id === id)) {
                alert('Student ID already exists!');
                return;
            }
            students.push({ id, name, gender, class: className });
        }

        saveToLocalStorage();
        studentModal.style.display = 'none';
        renderStudents();
    });

    function renderStudents(filterText = '') {
        const tbody = document.querySelector('#studentTable tbody');
        tbody.innerHTML = '';
        
        const filtered = students.filter(s => 
            s.name.toLowerCase().includes(filterText.toLowerCase()) || 
            s.id.toLowerCase().includes(filterText.toLowerCase())
        );

        filtered.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.id}</td>
                <td>${s.name}</td>
                <td>${s.gender}</td>
                <td>${s.class}</td>
                <td>
                    <button class="btn-primary" onclick="editStudent('${s.id}')" style="padding: 5px 10px; font-size: 0.8rem;">Edit</button>
                    <button class="btn-secondary" onclick="deleteStudent('${s.id}')" style="padding: 5px 10px; font-size: 0.8rem; color: red;">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.editStudent = (id) => {
        const s = students.find(stu => stu.id === id);
        document.getElementById('modalTitle').innerText = 'Edit Student';
        document.getElementById('editStudentId').value = s.id;
        document.getElementById('stuId').value = s.id;
        document.getElementById('stuName').value = s.name;
        document.getElementById('stuGender').value = s.gender;
        document.getElementById('stuClass').value = s.class;
        studentModal.style.display = 'flex';
    };

    window.deleteStudent = (id) => {
        if (confirm('Are you sure you want to delete this student? All their attendance records will also be removed.')) {
            students = students.filter(s => s.id !== id);
            attendanceRecords = attendanceRecords.filter(r => r.studentId !== id);
            saveToLocalStorage();
            renderStudents();
        }
    };

    document.getElementById('studentSearch').addEventListener('input', (e) => {
        renderStudents(e.target.value);
    });

    // Take Attendance
    const attendanceDateInput = document.getElementById('attendanceDate');
    const attendanceClassSelect = document.getElementById('attendanceClassSelect');
    const loadAttendanceBtn = document.getElementById('loadAttendanceList');
    const attendanceListContainer = document.getElementById('attendanceListContainer');
    const attendanceTableBody = document.querySelector('#attendanceTable tbody');
    const saveAttendanceBtn = document.getElementById('saveAttendance');

    // Set default date to today
    attendanceDateInput.value = new Date().toISOString().split('T')[0];

    function populateClasses() {
        const classes = [...new Set(students.map(s => s.class))];
        attendanceClassSelect.innerHTML = '<option value="">Select Class</option>';
        classes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.text = c;
            attendanceClassSelect.appendChild(opt);
        });
    }

    loadAttendanceBtn.addEventListener('click', () => {
        const date = attendanceDateInput.value;
        const className = attendanceClassSelect.value;

        if (!date || !className) {
            alert('Please select both date and class');
            return;
        }

        const classStudents = students.filter(s => s.class === className);
        if (classStudents.length === 0) {
            alert('No students found for this class');
            return;
        }

        attendanceListContainer.style.display = 'block';
        attendanceTableBody.innerHTML = '';

        classStudents.forEach(s => {
            // Check if record already exists for this date
            const existing = attendanceRecords.find(r => r.date === date && r.studentId === s.id);
            const status = existing ? existing.status : 'Present';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.id}</td>
                <td>${s.name}</td>
                <td>
                    <select class="status-select" data-student-id="${s.id}">
                        <option value="Present" ${status === 'Present' ? 'selected' : ''}>Present</option>
                        <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>Absent</option>
                        <option value="Late" ${status === 'Late' ? 'selected' : ''}>Late</option>
                        <option value="Excused" ${status === 'Excused' ? 'selected' : ''}>Excused</option>
                    </select>
                </td>
            `;
            attendanceTableBody.appendChild(tr);
        });
    });

    saveAttendanceBtn.addEventListener('click', () => {
        const date = attendanceDateInput.value;
        const className = attendanceClassSelect.value;
        const selects = document.querySelectorAll('.status-select');
        
        if (!date || !className) return;

        selects.forEach(sel => {
            const studentId = sel.dataset.studentId;
            const status = sel.value;

            // Remove existing record for this student on this date
            attendanceRecords = attendanceRecords.filter(r => !(r.date === date && r.studentId === studentId));
            
            attendanceRecords.push({
                date,
                studentId,
                status
            });
        });

        saveToLocalStorage();
        alert('Attendance saved successfully!');
    });

    // Attendance History
    const historyStudentIdInput = document.getElementById('historyStudentId');
    const historyDateInput = document.getElementById('historyDate');
    const filterHistoryBtn = document.getElementById('filterHistory');
    const historyTableBody = document.querySelector('#historyTable tbody');

    filterHistoryBtn.addEventListener('click', () => {
        const sid = historyStudentIdInput.value;
        const date = historyDateInput.value;

        let filtered = attendanceRecords;

        if (sid) {
            filtered = filtered.filter(r => r.studentId === sid);
        }
        if (date) {
            filtered = filtered.filter(r => r.date === date);
        }

        historyTableBody.innerHTML = '';
        filtered.forEach(r => {
            const s = students.find(stu => stu.id === r.studentId);
            if (!s) return;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.date}</td>
                <td>${s.id}</td>
                <td>${s.name}</td>
                <td>${s.class}</td>
                <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
            `;
            historyTableBody.appendChild(tr);
        });
    });

    // Reports
    const reportFromInput = document.getElementById('reportFrom');
    const reportToInput = document.getElementById('reportTo');
    const generateReportBtn = document.getElementById('generateReport');
    const reportResultsDiv = document.getElementById('reportResults');

    generateReportBtn.addEventListener('click', () => {
        const from = reportFromInput.value;
        const to = reportToInput.value;

        if (!from || !to) {
            alert('Please select date range');
            return;
        }

        let filtered = attendanceRecords.filter(r => r.date >= from && r.date <= to);
        
        if (filtered.length === 0) {
            reportResultsDiv.innerHTML = '<div class="report-card">No data found for selected range.</div>';
            return;
        }

        const studentStats = {};
        filtered.forEach(r => {
            if (!studentStats[r.studentId]) {
                studentStats[r.studentId] = { present: 0, total: 0 };
            }
            studentStats[r.studentId].present++;
            studentStats[r.studentId].total++;
            if (r.status !== 'Present') {
                studentStats[r.studentId].present--;
            }
        });

        let html = '<h3>Summary by Student</h3>';
        for (let id in studentStats) {
            const s = students.find(stu => stu.id === id);
            if (!s) continue;
            const stats = studentStats[id];
            const perc = Math.round((stats.present / stats.total) * 100);
            html += `
                <div class="report-card">
                    <strong>${s.name} (${s.id})</strong><br>
                    Attendance Rate: ${perc}% (${stats.present}/${stats.total} days)
                </div>
            `;
        }
        reportResultsDiv.innerHTML = html;
    });

    // Global Search
    document.getElementById('globalSearch').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query === '') return;

        // If we are on "Manage Students" page, just use the student search
        const activePage = document.querySelector('.page.active').id;
        if (activePage === 'manage-students') {
            document.getElementById('studentSearch').value = query;
            renderStudents(query);
        } else {
            // For simplicity, just navigate to manage students and then search
            document.querySelector('[data-target="manage-students"]').click();
            document.getElementById('studentSearch').value = query;
            renderStudents(query);
        }
    });

    // Initialization
    populateClasses();
    updateDashboard();
    
    // Update classes list whenever students are added/edited
    setInterval(populateClasses, 5000); 
});
