//removing 'http://127.0.0.1:3000' for deployment - this works because we are hosting server and client on the same server

/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// signUp function
export const signUp = async userData => {
  try {
    const res = await fetch('/api/v1/users/signUp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await res.json();
    if (data.status === 'success') {
      showAlert('success', 'Signup successful! 🎉');
      window.location.href = '/me'; // Redirect after signup
    } else {
      console.error(data);
      showAlert(data.message);
    }
  } catch (err) {
    console.error('Signup failed:', err);
  }
};

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password
      }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout'
    });
    if ((res.data.status = 'success'))
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
  } catch (err) {
    showAlert('error', 'Error logging out! Try again.');
  }
};
