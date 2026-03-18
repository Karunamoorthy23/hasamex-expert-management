
document.addEventListener('DOMContentLoaded', () => {

    // 1. Sidebar Toggle Logic
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // 2. Tab Switching Logic
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    function switchTab(targetId) {
        // Update Nav UI
        navItems.forEach(item => {
            if (item.getAttribute('data-target') === targetId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Views
        viewSections.forEach(view => {
            if (view.id === targetId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            if (targetId) {
                switchTab(targetId);
            }
        });
    });

    // Initialize with active tab
    const activeTab = document.querySelector('.nav-item.active');
    if (activeTab) {
        switchTab(activeTab.getAttribute('data-target'));
    }

    // 3. Customer Row Expand/Collapse Matrix
    const customerRows = document.querySelectorAll('.customer-row[data-expand]');

    customerRows.forEach(row => {
        row.addEventListener('click', () => {
            const nestedRowId = row.getAttribute('data-expand');
            const nestedRow = document.getElementById(nestedRowId);

            if (nestedRow) {
                const isCurrentlyVisible = nestedRow.style.display !== 'none';

                if (isCurrentlyVisible) {
                    nestedRow.style.display = 'none';
                    row.classList.remove('is-expanded');
                } else {
                    nestedRow.style.display = 'table-row';
                    row.classList.add('is-expanded');
                }
            }
        });
    });

    // 4. Dummy action for the Create button
    const createBtn = document.getElementById('createClientBtn');
    if (createBtn) {
        createBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent row click if button is inside row (though it isn't here)
            console.log("Create New Client clicked.");
            alert("Create New Client modal would open here.");
        });
    }
});