function saveGuest() {
  const guest = {
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    dateOfBirth: document.getElementById("birth").value,
    address: document.getElementById("address").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim()
  };

  if (!guest.firstName || !guest.lastName || !guest.dateOfBirth || !guest.address || !guest.phone || !guest.email) {
    alert("❗ Please fill in all the fields.");
    return;
  }

  fetch("http://localhost:8080/booksys/guest/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(guest)
  })
  .then(response => {
    if (!response.ok) throw new Error("Failed to save guest.");
    return response.json();
  })
  .then(data => {
    alert(`✅ Guest ${data.firstName} ${data.lastName} successfully added!`);
    clearForm();
  })
  .catch(error => {
    console.error("Error:", error);
    alert("❌ An error occurred while saving the guest.");
  });
}

function clearForm() {
  document.getElementById("firstName").value = "";
  document.getElementById("lastName").value = "";
  document.getElementById("birth").value = "";
  document.getElementById("address").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("email").value = "";
}

