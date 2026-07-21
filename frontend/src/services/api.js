import axios from "axios";
import { getApiBaseUrl } from "../config/apiConfig";

const API = axios.create({
  baseURL: getApiBaseUrl()
});

export default API;