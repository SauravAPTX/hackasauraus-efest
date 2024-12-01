import React, { useState } from 'react';
import { FileText, FileUp, FileDown } from 'lucide-react';
import "./filetransfer.css"

const FileTransfer = ({ fileTransfers, sendFile }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleFileSend = () => {
        if (selectedFile) {
            sendFile(selectedFile);
            setSelectedFile(null);
        }
    };

    const downloadFile = (transfer) => {
        const link = document.createElement('a');
        link.href = transfer.downloadUrl;
        link.download = transfer.name;
        link.click();
    };

    return (
        <div className="file-transfer-container">
            <div className="file-upload">
                <input 
                    type="file" 
                    id="file-input"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
                <label htmlFor="file-input" className="file-select-btn">
                    <FileUp />
                    <span>{selectedFile ? selectedFile.name : 'Select File'}</span>
                </label>
                {selectedFile && (
                    <button onClick={handleFileSend} className="file-send-btn">
                        <FileText /> Send
                    </button>
                )}
            </div>

            <div className="file-transfers-list">
                {fileTransfers.map((transfer, index) => (
                    <div key={index} className="file-transfer-item">
                        <div className="file-info">
                            <FileText />
                            <span>{transfer.name}</span>
                            <span>{transfer.size} bytes</span>
                        </div>
                        <div className="file-progress">
                            <div 
                                className="progress-bar" 
                                style={{ width: `${transfer.progress}%` }}
                            ></div>
                            <span>{transfer.status}</span>
                        </div>
                        {transfer.status === 'complete' && (
                            <button 
                                onClick={() => downloadFile(transfer)} 
                                className="file-download-btn"
                            >
                                <FileDown />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FileTransfer;