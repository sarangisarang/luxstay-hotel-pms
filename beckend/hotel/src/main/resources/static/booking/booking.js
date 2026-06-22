document.addEventListener("DOMContentLoaded", function () {
  const guestSelect = document.getElementById("guest");
  const roomSelect = document.getElementById("room");
  const checkInInput = document.getElementById("checkIn");
  const checkOutInput = document.getElementById("checkOut");
  const totalPriceDisplay = document.getElementById("totalPrice");
  const bookingForm = document.getElementById("bookingForm");
  const bookingTableBody = document.querySelector("#bookingTable tbody");

  // Fetch guests
  fetch("/booksys/guest/all")
    .then((res) => res.json())
    .then((guests) => {
      guests.forEach((guest) => {
        const option = document.createElement("option");
        option.value = guest.guestID;
        option.text = `${guest.firstName} ${guest.lastName}`;
        guestSelect.appendChild(option);
      });
    });

  // Fetch rooms
  fetch("/booksys/room/all")
    .then((res) => res.json())
    .then((rooms) => {
      rooms.forEach((room) => {
        const option = document.createElement("option");
        option.value = room.roomID;
        option.text = `Room ${room.roomID.substring(0, 6)} (${room.roomStatus})`;
        option.dataset.price = room.roomType?.pricePerNight || 0;
        roomSelect.appendChild(option);
      });
    });

  function calculateTotalPrice() {
    const inDate = new Date(checkInInput.value);
    const outDate = new Date(checkOutInput.value);
    const roomOption = roomSelect.options[roomSelect.selectedIndex];
    const pricePerNight = parseFloat(roomOption?.dataset.price || 0);
    const days = (outDate - inDate) / (1000 * 60 * 60 * 24);

    const total = days > 0 ? days * pricePerNight : 0;
    totalPriceDisplay.textContent = `Precio total: ${total.toFixed(2)} €`;
  }

  checkInInput.addEventListener("change", calculateTotalPrice);
  checkOutInput.addEventListener("change", calculateTotalPrice);
  roomSelect.addEventListener("change", calculateTotalPrice);

  function loadBookings() {
    fetch("/booksys/booking/all")
      .then((res) => res.json())
      .then((bookings) => {
        bookingTableBody.innerHTML = "";
        bookings.forEach((booking) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${booking.guest?.firstName || ""} ${booking.guest?.lastName || ""}</td>
            <td>${booking.room?.roomID || ""}</td>
            <td>${booking.checkIn}</td>
            <td>${booking.checkOut}</td>
            <td>${booking.totalPrice || 0}</td>
            <td><button onclick="deleteBooking('${booking.bookingID}')">Delete</button></td>
          `;
          bookingTableBody.appendChild(tr);
        });
      });
  }

  bookingForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const data = {
      checkIn: checkInInput.value,
      checkOut: checkOutInput.value,
      guest: { guestID: guestSelect.value }
    };

    const roomId = roomSelect.value;

    fetch(`/booksys/booking/create/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then((res) => {
        if (!res.ok) throw new Error("Booking failed");
        return res.json();
      })
      .then(() => {
        bookingForm.reset();
        totalPriceDisplay.textContent = "Precio total: 0 €";
        loadBookings();
      })
      .catch((err) => alert(err.message));
  });

  window.deleteBooking = function (id) {
    fetch(`/booksys/booking/${id}`, { method: "DELETE" })
      .then(() => loadBookings())
      .catch((err) => alert("Failed to delete booking"));
  };

  loadBookings();
});