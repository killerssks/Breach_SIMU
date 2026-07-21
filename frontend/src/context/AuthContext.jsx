import { createContext, useState, useEffect } from "react";
import API from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      API.get("/auth/me")
        .then((res) => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem("token");
          delete API.defaults.headers.common["Authorization"];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await API.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const { access_token } = res.data;
    localStorage.setItem("token", access_token);
    API.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    
    const userRes = await API.get("/auth/me");
    setUser(userRes.data);
  };

  const register = async (email, password, companyName) => {
    await API.post("/auth/register", {
      email,
      password,
      name: companyName || email,
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete API.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const res = await API.put("/auth/update", profileData);
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
