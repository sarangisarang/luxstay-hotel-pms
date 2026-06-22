document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("roomTypeForm");
  const tableBody = document.querySelector("#roomTypeTable tbody");

  // Fetch and display all room types
  function loadRoomTypes() {
    fetch("/booksys/roomtype/all")
      .then(res => res.json())
      .then(roomTypes => {
        tableBody.innerHTML = "";
        roomTypes.forEach(rt => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${rt.typeName}</td>
            <td>${rt.pricePerNight} €</td>
          `;
          tableBody.appendChild(row);
        });
      })
      .catch(err => {
        console.error("Error loading room types:", err);
        alert("⚠️ Failed to load room types.");
      });
  }

  // Handle form submission
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const roomType = {
      typeName: document.getElementById("typeName").value,
      pricePerNight: parseFloat(document.getElementById("pricePerNight").value)
    };

    fetch("/booksys/roomtype/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roomType)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to save room type");
        return res.json();
      })
      .then(() => {
        form.reset();
        loadRoomTypes();
        alert("✅ Room type saved successfully!");
      })
      .catch(err => {
        console.error("Error saving room type:", err);
        alert("❌ Could not save room type.");
      });
  });

  // Initial load
  loadRoomTypes();
});
