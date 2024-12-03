import {Component, OnDestroy, OnInit} from '@angular/core';

@Component({
  selector: 'app-video',
  standalone: true,
  imports: [],
  templateUrl: './video.component.html',
  styleUrl: './video.component.scss'
})
export class VideoComponent implements OnInit, OnDestroy {
  private mediaRecorder!: MediaRecorder;
  private recordedChunks: Blob[] = [];
  private stream!: MediaStream;
  private isUsingFrontCamera: boolean = true;

  async toggleCamera() {
    this.isUsingFrontCamera = !this.isUsingFrontCamera;
    await this.startCamera();
  }

  async startCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: {
        facingMode: this.isUsingFrontCamera ? 'user' : 'environment',
      },
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    const videoElement = document.querySelector('video');
    if (videoElement) {
      videoElement.srcObject = this.stream;
    }
  }

  startRecording() {
    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm; codecs=vp9' });

    this.mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);

        const maxChunks = 30; // Удаляем старые данные для записи последних 30 секунд.
        if (this.recordedChunks.length > maxChunks) {
          this.recordedChunks.shift();
        }
      }
    };

    this.mediaRecorder.start(1000); // Интервал записи 1 секунда.
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  saveLast30Seconds() {
    if (this.recordedChunks.length === 0) {
      alert('No video recorded to save!');
      return;
    }

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'last-30-seconds.webm';
    a.click();
    URL.revokeObjectURL(url);
  }

  ngOnInit() {
    this.startCamera();
  }

  ngOnDestroy() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
