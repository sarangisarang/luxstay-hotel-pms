function saveHotel() {
    const hotelName = document.getElementById("name").value;
    const address = document.getElementById("address").value;
    const phone = document.getElementById("phone").value;
    const email = document.getElementById("email").value;
    const stars = parseInt(document.getElementById("stars").value);
    const checkIn = document.getElementById("checkin").value + ":00"; // append seconds
    const checkOut = document.getElementById("checkout").value + ":00";

    const hotel = {
        hotelName: hotelName,
        address: address,
        phone: phone,
        email: email,
        stars: stars,
        checkInTime: checkIn,
        checkOutTime: checkOut
    };

    console.log("🔵 Sending:", hotel); // DEBUGGING

    fetch("http://localhost:8080/booksys/hotel/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hotel)
    })
    .then(response => {
        if (response.ok) {
            alert("✅ Hotel saved successfully!");
            clearHotelForm();
        } else {
            alert("❌ Failed to save hotel.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("❌ An error occurred while saving the hotel.");
    });
}

function clearHotelForm() {
    document.getElementById("name").value = "";
    document.getElementById("address").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("email").value = "";
    document.getElementById("stars").value = "";
    document.getElementById("checkin").value = "";
    document.getElementById("checkout").value = "";
}


