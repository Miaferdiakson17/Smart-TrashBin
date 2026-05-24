import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

const apiService = {

  login: (data) =>
    api.post("/login", data),

  signup: (data) =>
    api.post("/signup", data),

  getTrashData: () =>
    api.get("/trash"),

  getAdmins: () =>
    api.get("/admins"),

  deleteSingleTrash: (id) =>
    api.delete(`/trash/delete/${id}`),

};

export default apiService;