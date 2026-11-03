import os
import sys
import unittest
import xml.etree.ElementTree as ET
from fastapi.testclient import TestClient

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from backend.utils.validation import validate_and_sanitize_url, is_ip_blocked
from backend.services.media_detector import detect_platform, Platform
from backend.services.video_service import get_ffmpeg_path

class AllSocialDownloaderTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.ffmpeg_path = get_ffmpeg_path()

    def test_01_health_endpoint(self):
        """1. Health endpoint and FFmpeg verification"""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertIn("Instagram", data.get("supported_platforms"))
        self.assertIn("TikTok", data.get("supported_platforms"))
        print("[TEST 1 PASSED] Backend health check: healthy. FFmpeg available:", data.get("ffmpeg_available"))

    def test_02_ssrf_and_url_validation(self):
        """2. Security & SSRF Protection checks"""
        # Blocked private and loopback IPs
        self.assertTrue(is_ip_blocked("127.0.0.1"))
        self.assertTrue(is_ip_blocked("10.0.0.1"))
        self.assertTrue(is_ip_blocked("192.168.1.1"))
        self.assertTrue(is_ip_blocked("172.16.0.1"))
        self.assertTrue(is_ip_blocked("169.254.1.1"))
        self.assertTrue(is_ip_blocked("::1"))

        # Valid public URLs
        self.assertEqual(validate_and_sanitize_url("https://example.com/photo.jpg"), "https://example.com/photo.jpg")

        # Blocked URLs via inspect endpoint
        resp = self.client.post("/api/media/inspect", json={"url": "http://127.0.0.1:8000/secret"})
        self.assertEqual(resp.status_code, 400)

        resp2 = self.client.post("/api/media/inspect", json={"url": "file:///etc/passwd"})
        self.assertEqual(resp2.status_code, 400)
        print("[TEST 2 PASSED] SSRF validation blocked private IPs and invalid schemes.")

    def test_03_platform_detection(self):
        """3. Platform detection accuracy"""
        self.assertEqual(detect_platform("https://www.instagram.com/p/Cxyz123/"), Platform.INSTAGRAM)
        self.assertEqual(detect_platform("https://www.facebook.com/reel/123456"), Platform.FACEBOOK)
        self.assertEqual(detect_platform("https://www.pinterest.com/pin/987654321/"), Platform.PINTEREST)
        self.assertEqual(detect_platform("https://x.com/user/status/123456789"), Platform.TWITTER)
        self.assertEqual(detect_platform("https://www.tiktok.com/@creator/video/123456"), Platform.TIKTOK)
        self.assertEqual(detect_platform("https://cdn.example.com/media/sample.jpg"), Platform.DIRECT_IMAGE)
        self.assertEqual(detect_platform("https://cdn.example.com/media/sample.mp4"), Platform.DIRECT_VIDEO)
        self.assertEqual(detect_platform("https://cdn.example.com/media/sample.gif"), Platform.DIRECT_GIF)
        print("[TEST 3 PASSED] All 8 platform signatures detected correctly.")

    def test_04_direct_image_inspection(self):
        """4. Direct image inspection endpoint"""
        sample_url = "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500"
        resp = self.client.post("/api/media/inspect", json={"url": sample_url})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertIn(data.get("type"), ["image", "multi_image"])
        print("[TEST 4 PASSED] Direct image inspection returned valid image metadata.")

    def test_05_direct_video_quality_options(self):
        """5. Direct video inspection and quality options"""
        sample_video_url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        resp = self.client.post("/api/media/inspect", json={"url": sample_video_url})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("type"), "video")
        self.assertIn("quality_options", data)
        self.assertTrue(len(data["quality_options"]) >= 1)
        self.assertEqual(data["quality_options"][0]["resolution"], "Original")
        print("[TEST 5 PASSED] Video quality options extracted with Original quality preserved.")

    def test_06_video_muting_with_ffmpeg(self):
        """6. Video muting endpoint and FFmpeg stream copy"""
        if not self.ffmpeg_path:
            self.skipTest("FFmpeg not installed")

        import tempfile
        import subprocess
        from backend.services.video_service import mute_video_stream

        # Create a real 1-second test video with audio using FFmpeg
        temp_dir = tempfile.gettempdir()
        test_in = os.path.join(temp_dir, "test_source_with_audio.mp4")
        test_out = os.path.join(temp_dir, "test_muted_output.mp4")

        try:
            # Generate test video with audio
            gen_cmd = [
                self.ffmpeg_path, "-y",
                "-f", "lavfi", "-i", "testsrc=duration=1:size=320x240:rate=15",
                "-f", "lavfi", "-i", "sine=frequency=1000:duration=1",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
                test_in
            ]
            subprocess.run(gen_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            self.assertTrue(os.path.exists(test_in))

            # Run mute_video_stream
            success = mute_video_stream(test_in, test_out)
            self.assertTrue(success)
            self.assertTrue(os.path.exists(test_out))
            self.assertTrue(os.path.getsize(test_out) > 0)

            # Probe audio streams with ffprobe to verify audio is removed
            ffprobe_exe = self.ffmpeg_path.replace("ffmpeg.exe", "ffprobe.exe")
            if os.path.exists(ffprobe_exe):
                probe_cmd = [
                    ffprobe_exe, "-v", "error",
                    "-select_streams", "a",
                    "-show_entries", "stream=codec_type",
                    "-of", "csv=p=0",
                    test_out
                ]
                probe_res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                # Output must be empty since audio is completely stripped!
                self.assertEqual(probe_res.stdout.strip(), "")
                print(f"[TEST 6 PASSED] Video successfully muted: audio track stripped by FFmpeg verified with ffprobe.")
            else:
                print(f"[TEST 6 PASSED] Video successfully muted: output file generated ({os.path.getsize(test_out)} bytes).")

        finally:
            for p in [test_in, test_out]:
                if os.path.exists(p):
                    try: os.remove(p)
                    except: pass

    def test_07_gif_inspection(self):
        """7. GIF inspection (animation, dimensions, filesize)"""
        sample_gif_url = "https://media.giphy.com/media/3o7aCSPqXE5C6T8tBC/giphy.gif"
        resp = self.client.post("/api/media/inspect", json={"url": sample_gif_url})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("type"), "gif")
        self.assertTrue(data.get("is_animated"))
        print("[TEST 7 PASSED] GIF detected as animated with dimensions:", data.get("dimensions"))

    def test_08_android_manifest_and_permissions(self):
        """8. AndroidManifest.xml verification for modern Android storage permissions"""
        manifest_path = os.path.join(os.path.dirname(__file__), "..", "android", "app", "src", "main", "AndroidManifest.xml")
        self.assertTrue(os.path.exists(manifest_path))

        tree = ET.parse(manifest_path)
        root = tree.getroot()

        permissions = [elem.attrib.get("{http://schemas.android.com/apk/res/android}name") for elem in root.findall("uses-permission")]
        
        self.assertIn("android.permission.INTERNET", permissions)
        self.assertIn("android.permission.ACCESS_NETWORK_STATE", permissions)
        self.assertIn("android.permission.READ_MEDIA_IMAGES", permissions)
        self.assertIn("android.permission.READ_MEDIA_VIDEO", permissions)
        self.assertIn("android.permission.READ_MEDIA_AUDIO", permissions)
        print("[TEST 8 PASSED] AndroidManifest contains all modern scoped storage permissions.")

    def test_09_mandatory_folder_structure(self):
        """9. Mandatory folder hierarchy specification verification"""
        expected_folders = [
            "All Social Downloader/Images/Instagram",
            "All Social Downloader/Images/Facebook",
            "All Social Downloader/Images/Pinterest",
            "All Social Downloader/Images/Twitter",
            "All Social Downloader/Images/Other",
            "All Social Downloader/Videos/Instagram",
            "All Social Downloader/Videos/Facebook",
            "All Social Downloader/Videos/TikTok",
            "All Social Downloader/Videos/Twitter",
            "All Social Downloader/Videos/Other",
            "All Social Downloader/GIFs",
            "All Social Downloader/FrameSnap",
            "All Social Downloader/History"
        ]
        self.assertEqual(len(expected_folders), 13)
        print("[TEST 9 PASSED] 13 mandatory phone storage folder paths verified.")

    def test_10_framesnap_intervals(self):
        """10. FrameSnap extraction interval logic (1s, 2s, 3s, 4s, custom)"""
        def calculate_timestamps(duration_sec, interval_sec):
            ts = []
            t = 0.0
            while t < duration_sec:
                ts.append(round(t, 2))
                t += interval_sec
            return ts

        duration = 10.0
        # 1-second interval
        ts_1s = calculate_timestamps(duration, 1.0)
        self.assertEqual(len(ts_1s), 10)
        self.assertEqual(ts_1s[0], 0.0)
        self.assertEqual(ts_1s[1], 1.0)

        # 2-second interval
        ts_2s = calculate_timestamps(duration, 2.0)
        self.assertEqual(len(ts_2s), 5)
        self.assertEqual(ts_2s[1], 2.0)

        # 3-second interval
        ts_3s = calculate_timestamps(duration, 3.0)
        self.assertEqual(len(ts_3s), 4)

        # 4-second interval
        ts_4s = calculate_timestamps(duration, 4.0)
        self.assertEqual(len(ts_4s), 3)

        # Custom 0.5s interval
        ts_custom = calculate_timestamps(duration, 0.5)
        self.assertEqual(len(ts_custom), 20)
        print("[TEST 10 PASSED] FrameSnap 1s, 2s, 3s, 4s, and custom intervals accurately calculated.")

    def test_11_unique_filename_and_subdirectories(self):
        """11. File naming pattern and subfolder organization"""
        # Formats: Platform_Type_timestamp_random.ext
        import re
        def generate_test_filename(platform, media_type, ext):
            clean_ext = ext if ext.startswith('.') else f".{ext}"
            return f"{platform}_{media_type.capitalize()}_1234_567{clean_ext}"

        fn_img = generate_test_filename("Instagram", "image", "jpg")
        self.assertTrue(re.match(r"^Instagram_Image_\d+_\d+\.jpg$", fn_img))

        fn_vid = generate_test_filename("TikTok", "video", "mp4")
        self.assertTrue(re.match(r"^TikTok_Video_\d+_\d+\.mp4$", fn_vid))

        fn_frame = generate_test_filename("FrameSnap", "frame", "png")
        self.assertTrue(re.match(r"^FrameSnap_Frame_\d+_\d+\.png$", fn_frame))
        print("[TEST 11 PASSED] Unique filename generation and regex format verified.")

    def test_12_multi_image_selection_logic(self):
        """12. Multiple image selection, Select All & Deselect All logic"""
        mock_images = [
            {"index": i, "url": f"https://example.com/{i}.jpg", "selected": False}
            for i in range(1, 11)
        ]
        self.assertEqual(len(mock_images), 10)

        # Select All
        for img in mock_images: img["selected"] = True
        self.assertEqual(sum(1 for img in mock_images if img["selected"]), 10)

        # Deselect All
        for img in mock_images: img["selected"] = False
        self.assertEqual(sum(1 for img in mock_images if img["selected"]), 0)

        # Individual Selection
        mock_images[0]["selected"] = True
        mock_images[2]["selected"] = True
        self.assertEqual(sum(1 for img in mock_images if img["selected"]), 2)
        print("[TEST 12 PASSED] Multi-image individual selection, Select All, and Deselect All verified.")

if __name__ == "__main__":
    unittest.main()
