/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

//Update Data

//'Type' is either 'password' or 'user data' and 'data is an obj having curr pass, new pass, and confirm pass
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';

    const res = await axios({
      method: 'PATCH',
      url,
      data
    });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} Updated Successfully`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
