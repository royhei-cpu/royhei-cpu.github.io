# Narrated Home Care tutorial

The tutorial has English narration synchronized to 12 existing catalog/Excel scenes, English captions, and the GitHub catalog address. Runtime is about 2 minutes 12 seconds.

The MP4 is stored in base64 transport chunks because large connector uploads were interrupted. `assemble.py` verifies its byte length and SHA-256 before writing the video to both existing public video/download paths. The Pages workflow runs this read-only build step before copying the Home Care site; it downloads nothing and does not push commits.

Public player: https://royhei-cpu.github.io/home-care/tutorial.html

When updating the tutorial, replace the manifest and all chunks together, keep the caption file and transcript aligned, and preserve the assembly step. The old MP4 paths in the source tree are overwritten by the assembled narrated version during publication.
