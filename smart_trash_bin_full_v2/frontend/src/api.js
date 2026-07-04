import axios from "axios";

// Mengarah ke backend Flask lokal (Port 5000)
const BASE_URL = "http://127.0.0.1:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

const apiService = {

  // ========== AUTHENTICATION ==========
  login: (data) =>
    api.post("/login", data),

  signup: (data) =>
    api.post("/signup", data),

  // ========== TRASH DATA ==========
  sendTrashData: (data) =>
    api.post("/trash", data),

  getTrashData: () =>
    api.get("/trash"),

  deleteSingleTrash: (id) =>
    api.delete(`/trash/delete/${id}`),

  // ========== USER MANAGEMENT ==========
  getAdmins: () =>
    api.get("/admins"),

  getPendingUsers: () =>
    api.get("/pending-users"),

  approveUser: (email, action) =>
    api.post("/approve-user", { email, action }),

  deleteUser: (email) =>
    api.post("/delete-user", { email }),

  // =========================================================
  // [FITUR BARU] UPDATE PROFILE ADMIN VIA PUT METHOD
  // =========================================================
  updateProfile: (data) =>
    api.put("/update-profile", data),

  // ========== BIN MANAGEMENT ==========
  resetBin: (binId) =>
    api.post("/reset", { bin_id: binId }),

  testSensor: () =>
    api.get("/test-sensor"),

};

export default apiService;