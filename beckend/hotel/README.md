# hotel
implement the following usecases

# find available rooms: 
- the customer sends a request with checkin date, checkout date and hotel(name or location) to the endpoint.
- the endpoint replies with the available rooms

# Hotel

we need here to implement logic:
- ToDo -> "guests are checked in"
- ToDo -> "guests are checked out"

# Booking
book the available room:
- the customer selects available rooms and sends a request to endpoint to book it
- the endpoint replies with status of booking (ok, not ok)

# Room

what is purpose of the room.roomstatus?  
free: guest are checked out
occupaid: there are guests checked in
reserved: ? no idea <-- LocalDate today(when make booking ) < LocalDate When is checkin


# Workspace.xml file
Tracking of local changes to the workspace.xml file can be prevented with the:
git update-index --assume-unchanged .idea/workspace.xml command

# Docker Image
- create docker image. run this command where Dockerfile is located!
  docker build --tag=hotels-api:latest 
- run docker image as container. run this command where Dockerfile is located!
docker run -p8888:8080 hotels-api:latest
