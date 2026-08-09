const fs = require("fs");
const path = require("path");

async function run() {
  // We can fetch from local server
  const response1 = await fetch("http://localhost:5000/api/certificates/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // We don't have admin token in headers, but wait, the endpoint is protected by protectAdmin!
    }
  });
}
