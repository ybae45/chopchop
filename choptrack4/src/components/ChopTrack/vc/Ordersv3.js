import React, { useState, useEffect } from "react";
import { storage } from '../../firebase/firebaseConfig';
import { ref, uploadBytes, listAll, getDownloadURL } from 'firebase/storage';
import { v4 } from 'uuid';
import { Button, TextField, Stack, Typography, Dialog, DialogContent, DialogActions } from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import './Orders.css';

const DEFAULT_FILE_NAME = "No image selected";
const DEFAULT_FORM_STATE = {
  address: "",
  amount: "",
  date: null,
  fileName: DEFAULT_FILE_NAME,
  file: null,
  locationName: "",
  items: "",
};

function Orders() {
  const [imageUpload, setImageUpload] = useState(null); // Selected image
  const [imageList, setImageList] = useState([]); // List of uploaded images
  const [formFields, setFormFields] = useState(DEFAULT_FORM_STATE);
  const [showDialog, setShowDialog] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // New state to hold the uploaded image URL

  // Store receipt image in Firebase
  const imageListRef = ref(storage, "images/");

  const uploadImage = () => {
    if (!imageUpload) return;

    const imageRef = ref(storage, `images/${imageUpload.name + v4()}`);
    uploadBytes(imageRef, imageUpload).then((snapshot) => {
      getDownloadURL(snapshot.ref).then((url) => {
        setImageList((prev) => [...prev, url]);
        setUploadedImageUrl(url); // Store the uploaded image URL
      });
    });
  };

  useEffect(() => {
    const fetchImages = async () => {
      const response = await listAll(imageListRef);
      const urls = await Promise.all(
        response.items.map((item) => getDownloadURL(item))
      );
      setImageList(urls);
    };

    fetchImages();
  }, []);

  const handleSubmit = () => {
    uploadImage();
    // Don't close the modal now, since you want it to stay open
    setFormFields(DEFAULT_FORM_STATE); // Reset form
    setImageUpload(null); // Reset image upload state
  };

  const handleCancel = () => {
    setFormFields(DEFAULT_FORM_STATE); // Reset form fields
    setImageUpload(null); // Reset selected image
    setUploadedImageUrl(null); // Reset uploaded image URL
    setShowDialog(false); // Close the modal
  };


  const setFileData = (target) => {
    const file = target.files[0];
    setFormFields((prevState) => ({
      ...prevState,
      fileName: file.name,
      file: file,
    }));
    setImageUpload(file);
  };

  
  return (
    <div className="orders">
      <h2>Orders</h2>
      <div className="App">
        <Button variant="contained" onClick={() => setShowDialog(true)}>
          Add Receipt
        </Button>
      </div>

      {/* Form Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <Typography variant="h4" style={{ margin: "16px" }}>
          Add Receipt
        </Typography>
        <DialogContent>
          <Stack spacing={2} direction="row"> {/* Adjust direction to display fields and image side by side */}
            <div style={{ flex: 1 }}>
              <Button variant="outlined" component="label" color="secondary">
                Upload Receipt
                <input type="file" hidden onInput={(e) => setFileData(e.target)} />
              </Button>
              <Typography>{formFields.fileName}</Typography>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={formFields.date}
                  onChange={(newDate) =>
                    setFormFields((prevState) => ({ ...prevState, date: newDate }))
                  }
                  renderInput={(params) => <TextField {...params} />}
                />
              </LocalizationProvider>
              <TextField
                label="Location Name"
                value={formFields.locationName}
                onChange={(e) =>
                  setFormFields((prevState) => ({
                    ...prevState,
                    locationName: e.target.value,
                  }))
                }
              />
              <TextField
                label="Address"
                value={formFields.address}
                onChange={(e) =>
                  setFormFields((prevState) => ({
                    ...prevState,
                    address: e.target.value,
                  }))
                }
              />
              <TextField
                label="Items"
                value={formFields.items}
                onChange={(e) =>
                  setFormFields((prevState) => ({
                    ...prevState,
                    items: e.target.value,
                  }))
                }
              />
              <TextField
                label="Amount"
                value={formFields.amount}
                onChange={(e) =>
                  setFormFields((prevState) => ({
                    ...prevState,
                    amount: e.target.value,
                  }))
                }
              />
            </div>

            {/* Scaled down image display */}
            {uploadedImageUrl && (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <img
                  src={uploadedImageUrl}
                  alt="Uploaded receipt"
                  style={{
                    width: '100%',
                    maxWidth: '200px', // Scales down the image
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Display uploaded receipt images */}
      <div className="image-gallery">
        {imageList.map((url, index) => (
          <img key={index} src={url} alt={`Receipt ${index + 1}`} />
        ))}
      </div>
    </div>
  );
}

export default Orders;
