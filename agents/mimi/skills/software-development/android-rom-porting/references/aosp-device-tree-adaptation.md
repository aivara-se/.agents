# Adapting an AOSP device tree to another ROM

## Local manifest

Add every project the device tree inherits but the ROM manifest does not ship.

- Give each `remote` an explicit `fetch`. Redeclaring an existing remote without `fetch` replaces it with one that has no URL, and `repo sync` fails.
- The usual set is `device/<vendor>/<codename>`, `device/<vendor>/<common>`, `vendor/<vendor>/{common,codename}`, `kernel/<vendor>/<soc>`, `hardware/<vendor>`, `device/qcom/sepolicy_vndr`, `hardware/qcom-caf/common` and `hardware/qcom-caf/<platform>/{audio,display,media}`.
- Check each branch and file before you pin it. Request the raw URL. A missing branch, or a missing `SEPolicy.mk` in `device/qcom/sepolicy_vndr`, fails late.
- Use the oldest branch that still exists when a repo has no branch for the target platform. The device tree pins the combination that works.

## Product makefile

- Copy `<source>_<device>.mk` to `<target>_<device>.mk`.
- Keep the AOSP base inherits: `core_64_bit.mk` and `full_base.mk` or `full_base_telephony.mk`.
- Replace the source ROM's common inherit with the target ROM's. Examples: `vendor/aosp/config/common_full_tablet_wifionly.mk`, `vendor/pixelos/config/common.mk`, `vendor/lineage/config/common_full_tablet_wifionly.mk`.
- Rename `PRODUCT_NAME` and keep the device, brand and manufacturer fields.
- Add the product to `AndroidProducts.mk` and to `COMMON_LUNCH_CHOICES`.
- Keep the stock build fingerprint override until Play certification fails. It identifies the device to GMS.

## Packages to strip

Grep the device tree for the source ROM's vendor namespace, for example `grep -rn 'lineage' device/<vendor>/`.

Remove packages the target ROM does not define:

- `vendor.lineage.health-service.default`
- `vendor.lineage.livedisplay-service.*`
- `lineage-sdk` overlays and `overlay-lineage`
- `LineageParts` and `LineageSettingsProvider`

An unknown `PRODUCT_PACKAGES` entry fails at packaging, not at parse time. The error names the module, not the line that added it.

## Failure order

1. `inherit-product` of a missing path: add the repo to the local manifest.
2. `namespace ... does not exist`: add the CAF trees and the linkfile that creates their `Android.bp`.
3. `module ... not found`: remove the package or add its repo.
4. `system image too large`: measure, then drop GMS or apps.
5. Boot loop: check the kernel branch, dtbo and vbmeta flags. Read pstore or `/proc/last_kmsg`.
6. SELinux denial: add a rule to the device sepolicy. Do not ship permissive as the fix.

## Worked example: Galaxy Tab S5e

- Codenames: `gts4lvwifi` (SM-T720, Wi-Fi), `gts4lv` (SM-T725, LTE).
- Android 16 tree: `anton-scholten/android_device_samsung_gts4lv-common`, branch `lineage-23.2`.
- Kernel: `anton-scholten/android_kernel_samsung_sdm670`, branch `lineage-23.2`. It carries the eBPF and EROFS backport that Android 16 needs on the 4.9 kernel.
- Device: `LineageOS/android_device_samsung_gts4lvwifi`, branch `lineage-22.2`.
- Vendor: `anton-scholten/proprietary_vendor_samsung_gts4lv-common` (`lineage-23.2`), `TheMuppets/proprietary_vendor_samsung_gts4lvwifi` (`lineage-22.2`).
- Hardware: `LineageOS/android_hardware_samsung`, branch `lineage-23.2`.
- Sepolicy: `LineageOS/android_device_qcom_sepolicy_vndr`, branch `lineage-23.2-legacy-um`.
- CAF: `LineageOS/android_hardware_qcom-caf_common` (`lineage-23.2`) with `<linkfile src="os_pickup_qssi.bp" dest="hardware/qcom-caf/sdm845/Android.bp" />`; audio, display and media at `lineage-23.2-caf-sdm845`.
- Partitions: A-only, non-A/B, no dynamic partitions. System is 4445962240 bytes (4.14 GiB); vendor is 939524096 bytes (896 MiB).
- No `/metadata` partition. The tree maps `/metadata` onto the 20 MB OMR partition, so the recovery must format data before the ROM is sideloaded.
- PixelOS `sixteen` product: inherit `vendor/aosp/config/common_full_tablet_wifionly.mk`; lunch `pixelos_gts4lvwifi-bp2a-userdebug`.

The repository names, branches and files above were checked against GitHub. The assembled tree was not compiled in this session. Expect the failure order above on the first builds.
