const http = require("http");
const { URL } = require("url");

const PORT = 5000; 

// In-memory database
let students = [];
let nextId = 1;

// Utility: Send JSON response
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

// Utility: Get request body
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1e6) req.connection.destroy(); // prevent big payload
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

// Validate student fields
function validateStudent(obj, { requireAll = true } = {}) {
  const errors = [];
  if (requireAll) {
    if (!obj.name || typeof obj.name !== "string") errors.push("name is required and must be a string");
    if (!obj.age || typeof obj.age !== "number") errors.push("age is required and must be a number");
    if (!obj.course || typeof obj.course !== "string") errors.push("course is required and must be a string");
    if (!obj.year_level || typeof obj.year_level !== "number") errors.push("year_level is required and must be a number");
    if (!obj.status || typeof obj.status !== "string") errors.push("status is required and must be a string");
  } else {
    if ("name" in obj && typeof obj.name !== "string") errors.push("name must be a string");
    if ("age" in obj && typeof obj.age !== "number") errors.push("age must be a number");
    if ("course" in obj && typeof obj.course !== "string") errors.push("course must be a string");
    if ("year_level" in obj && typeof obj.year_level !== "number") errors.push("year_level must be a number");
    if ("status" in obj && typeof obj.status !== "string") errors.push("status must be a string");
  }
  return errors;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  // Health check
  if (path === "/health" && method === "GET") {
    return sendJSON(res, 200, { status: "API running" });
  }

  // Students collection
  if (path === "/students") {
    if (method === "GET") {
      return sendJSON(res, 200, students);
    }
    if (method === "POST") {
      try {
        const body = await getRequestBody(req);
        const errors = validateStudent(body, { requireAll: true });
        if (errors.length) return sendJSON(res, 400, { errors });

        const student = {
          student_id: nextId++,
          name: body.name,
          age: body.age,
          course: body.course,
          year_level: body.year_level,
          status: body.status
        };
        students.push(student);
        return sendJSON(res, 201, student);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }
  }

  // Single student
  const match = path.match(/^\/students\/(\d+)$/);
  if (match) {
    const id = parseInt(match[1]);
    const index = students.findIndex(s => s.student_id === id);

    if (method === "GET") {
      if (index === -1) return sendJSON(res, 404, { error: "Student not found" });
      return sendJSON(res, 200, students[index]);
    }

    if (method === "PUT") {
      try {
        const body = await getRequestBody(req);
        const errors = validateStudent(body, { requireAll: true });
        if (errors.length) return sendJSON(res, 400, { errors });
        if (index === -1) return sendJSON(res, 404, { error: "Student not found" });

        students[index] = { student_id: id, ...body };
        return sendJSON(res, 200, students[index]);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (method === "PATCH") {
      try {
        const body = await getRequestBody(req);
        const errors = validateStudent(body, { requireAll: false });
        if (errors.length) return sendJSON(res, 400, { errors });
        if (index === -1) return sendJSON(res, 404, { error: "Student not found" });

        students[index] = { ...students[index], ...body };
        return sendJSON(res, 200, students[index]);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (method === "DELETE") {
      if (index === -1) return sendJSON(res, 404, { error: "Student not found" });
      const removed = students.splice(index, 1)[0];
      return sendJSON(res, 200, removed);
    }
  }

  return sendJSON(res, 404, { error: "Route not found" });
});

server.listen(PORT, () => {
  console.log(`Student API running at http://localhost:${PORT}`);
});
