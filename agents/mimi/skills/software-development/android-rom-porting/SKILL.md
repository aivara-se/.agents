---
name: android-rom-porting
description: "Port an AOSP ROM to a new device from an existing tree."
version: 0.1.0
author: MiMi (thani-sh-mimi), Hermes Agent
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [android, aosp, rom, porting, bringup, lineageos, pixelos]
    related_skills: [change-planning, systematic-debugging]
---

# Android ROM porting

Port the device tree, not the ROM. The ROM is the platform. The device tree, kernel and vendor blobs are the hardware support. A build that starts from the ROM source alone has no display, audio or radio.

## When to Use

- The user asks to port PixelOS, LineageOS, crDroid or another AOSP-based ROM to a device the ROM does not support.
- You must judge whether an existing device tree, kernel and vendor blobs can serve another ROM.
- A build fails at product inheritance, a Soong namespace, packaging or system image size.

Find a maintained tree first. Do not write a device tree or a kernel from scratch for a one-off port.

## Procedure

1. Identify the device.
   - Read Settings, About device, Model. A marketing name covers several variants with different codenames.
   - Record the codename, SoC, RAM, storage and the Android version the device shipped with.
2. Find a maintained device tree for the same Android version.
   - Search the LineageOS wiki and GitHub for `<codename> device tree`.
   - Prefer an unofficial port that already boots on your target Android version. It carries the kernel backport and HAL fixes that take weeks to find.
   - Match branches by platform version: an Android 16 ROM needs an Android 16 tree. A tree one release behind does not compile.
3. Read the board config before you plan the build.
   - Check `AB_OTA_UPDATER`, `BOARD_BUILD_SUPER_IMAGE_BY_DEFAULT`, `BOARD_*IMAGE_PARTITION_SIZE` and `BOARD_USES_METADATA_PARTITION`.
   - These flags decide the flash path. A-only and non-dynamic devices flash a recovery zip, not a super image.
4. Prove the device path first.
   - Flash an existing build of the reference ROM for that device. Confirm unlock, recovery and boot.
   - This is the cheapest test of the bootloader and firmware. Do it before the first compile.
5. Build the reference ROM once on the host.
   - This separates host errors from port errors. Keep the log.
6. Switch to the target ROM.
   - Reuse the device, vendor and kernel projects in a local manifest.
   - Add the target ROM's product makefile. Remove the packages the target ROM does not define. Build.
7. Flash and test against a fixed checklist.

## Pitfalls

- Unlocking a Samsung bootloader erases data and trips Knox permanently. State this before the user starts. Samsung Pay and Secure Folder stop working.
- Android 16 needs a `/metadata` partition. Devices that shipped without one map it onto an unused partition, often OMR. Only the matching recovery formats it. Do not substitute a recovery from another device.
- Legacy Qualcomm trees need `hardware/qcom-caf/<platform>` (audio, display, media) and the Soong namespace that the vendor blobs import. Newer ROM manifests removed those projects. Add them locally and recreate `hardware/qcom-caf/<platform>/Android.bp` from `os_pickup_qssi.bp`. Without the namespace, Soong aborts before ninja runs.
- AOSP builds are memory-bound, not CPU-bound. A 15 GB host is OOM-killed during Soong's glob phase. Plan for 64 GB RAM and 400 GB free SSD.
- The system partition is fixed. Measure `du -sb out/target/product/<device>/system` before adding GMS or a large app set. GMS can push a 4 GiB system image over its limit.
- Device tree edits disappear on `repo sync`. Keep them in a patch file or a separate product directory.
- Do not lock the bootloader after flashing.

## Done means

- It boots to setup.
- Wi-Fi, touch, audio, camera, sleep and charging work.
- `adb shell getenforce` returns `Enforcing`.
- `adb logcat | grep avc` shows no repeated denial.

Report each item with a measurement or a log line, not with "it works".

## Reference

- `references/aosp-device-tree-adaptation.md` — local manifest, product makefile edits, packages to strip, failure order, and a checked tree set for the Galaxy Tab S5e.
