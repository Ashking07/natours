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

    //NEW ADDITION
    // 1️⃣ MFA not yet complete
    if (res.data.status === 'pending') {
      showAlert(
        'info',
        'Check your e-mail and paste the 2-FA code below to finish login.'
      );
      // show
      document.getElementById('overlay').classList.remove('hidden');

      // keep email in hidden field so you can resend if needed
      document.querySelector('#mfaEmail').value = email;
      return;
    }
    //NEW ADDITION

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

//NEW ADDITION
const verifyBtn = document.getElementById('verifyBtn');
if (verifyBtn) {
  verifyBtn.addEventListener('click', async () => {
    const token = document.getElementById('mfaCode').value.trim();
    if (!token) return showAlert('error', 'Please enter the code');

    try {
      const res = await axios.get(`/api/v1/users/verify-2fa/${token}`);

      if (res.data.status === 'success') {
        showAlert('success', '2-FA complete, you are now logged in!');
        window.setTimeout(() => location.assign('/'), 1500);
      }
    } catch (err) {
      showAlert('error', err.response.data.message || 'Invalid/expired code');
    }
  });
}
//NEW ADDITION

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
