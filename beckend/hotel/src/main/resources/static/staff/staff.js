// staff.js

document.addEventListener("DOMContentLoaded", () => {
    loadStaff();
});

function saveStaff() {
    const staff = {
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        positions: document.getElementById("position").value,
        salary: document.getElementById("salary").value,
        dateOfBirth: document.getElementById("dob").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
        hireDate: document.getElementById("hireDate").value,
        hotel: {
            hotelID: document.getElementById("hotelID").value
        }
    };

    fetch("http://localhost:8080/booksys/staff/save", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(staff)
    })
    .then(response => {
        if (response.ok) {
            alert("✅ Staff member added successfully!");
            clearForm();
            loadStaff();
        } else {
            alert("❌ Failed to add staff member.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("❌ Error occurred while adding staff member.");
    });
}

function clearForm() {
    document.getElementById("firstName").value = "";
    document.getElementById("lastName").value = "";
    document.getElementById("position").value = "";
    document.getElementById("salary").value = "";
    document.getElementById("dob").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("email").value = "";
    document.getElementById("hireDate").value = "";
    document.getElementById("hotelID").value = "";
}

function loadStaff() {
    fetch("http://localhost:8080/booksys/staff/all")
        .then(response => response.json())
        .then(data => {
            const table = document.getElementById("staffTable");
            table.innerHTML = "";

            data.forEach(staff => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${staff.firstName} ${staff.lastName}</td>
                    <td>${staff.positions}</td>
                    <td>${staff.phone}</td>
                    <td>${staff.email}</td>
                    <td><button onclick="deleteStaff('${staff.staffID}')">Delete</button></td>
                `;
                table.appendChild(row);
            });
        });
}

function deleteStaff(id) {
    fetch(`http://localhost:8080/booksys/staff/${id}`, {
        method: "DELETE"
    })
    .then(response => {
        if (response.ok) {
            alert("🗑️ Staff deleted successfully");
            loadStaff();
        } else {
            alert("❌ Failed to delete staff");
        }
    })
    .catch(error => console.error("Error deleting staff:", error));
}
