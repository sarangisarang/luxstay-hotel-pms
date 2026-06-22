document.addEventListener("DOMContentLoaded", function () {
  const hotelSelect = document.getElementById("hotelSelect");
  const roomTypeSelect = document.getElementById("roomTypeSelect");
  const statusSelect = document.getElementById("statusSelect");
  const roomForm = document.getElementById("roomForm");
  const roomTableBody = document.getElementById("roomTableBody");

  // Load all hotels
  fetch("/booksys/hotel/all")
    .then((res) => res.json())
    .then((hotels) => {
      hotels.forEach((hotel) => {
        const option = document.createElement("option");
        option.value = hotel.hotelID;
        option.textContent = hotel.hotelName;
        hotelSelect.appendChild(option);
      });
    })
    .catch((err) => console.error("Error loading hotels:", err));

  // Load all room types
  fetch("/booksys/roomtype/all")
    .then((res) => res.json())
    .then((roomTypes) => {
      roomTypes.forEach((type) => {
        const option = document.createElement("option");
        option.value = type.typeID;
        option.textContent = type.name;
        roomTypeSelect.appendChild(option);
      });
    })
    .catch((err) => console.error("Error loading room types:", err));

  // Load existing rooms
  function loadRooms() {
    fetch("/booksys/room/all")
      .then((res) => res.json())
      .then((rooms) => {
        roomTableBody.innerHTML = "";
        rooms.forEach((room) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${room.roomID?.substring(0, 6)}</td>
            <td>${room.hotel?.hotelName || "Unknown"}</td>
            <td>${room.roomType?.name || "Unknown"}</td>
            <td>${room.roomStatus}</td>
            <td><button onclick="deleteRoom('${room.roomID}')">Delete</button></td>
          `;
          roomTableBody.appendChild(row);
        });
      })
      .catch((err) => console.error("Error loading rooms:", err));
  }

  // Submit new room
  roomForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const data = {
      hotel: { hotelID: hotelSelect.value },
      roomType: { typeID: roomTypeSelect.value },
      roomStatus: statusSelect.value.toLowerCase(), // Lowercase for backend compatibility
    };

    fetch("/booksys/room/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save room");
        return res.json();
      })
      .then(() => {
        roomForm.reset();
        loadRooms();
      })
      .catch((err) => alert(err.message));
  });

  // Delete room
  window.deleteRoom = function (roomId) {
    fetch(`/booksys/room/${roomId}`, { method: "DELETE" })
      .then(() => loadRooms())
      .catch((err) => alert("Failed to delete room"));
  };

  // Initial load
  loadRooms();
});

