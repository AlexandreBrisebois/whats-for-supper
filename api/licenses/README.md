# Renderer dependency notices

PDFtoImage 5.4.0 is pinned for qualification. The wrapper MIT license is retained here.
The image also retains license/notice/copying files actually shipped in the resolved
PDFtoImage, bblanchon.PDFium.Linux, SkiaSharp and SkiaSharp.NativeAssets.Linux.NoDependencies packages.
Inventory the resolved package versions and native third-party notices during qualification;
do not assert native-license completeness from the wrapper's MIT notice alone.
Record production image digest and resolved dependencies with the fixture report.


Qualification resolved PDFium Linux 152.0.7961 and SkiaSharp 4.150.1. NuGet's PDFium package omits the native third-party notice bundle. The Docker build therefore retains the `licenses/` trees from the exact chromium/7961 Linux x64/arm64 binary distributions, using SHA-256 checksums published on that release. It does not substitute their binaries. The pinned SkiaSharp upstream license files and the packaged DejaVu copyright are retained too. Including ARM64 notices is not an ARM64 runtime qualification claim. Review the image inventory and resolved package versions whenever these pins change.

SkiaSharp 4.150.1 pins mono/skia commit `0aa2d542e833ffd1d4d1b68a5152375e7f65ce11`; its BSD license and in-tree third-party notices are retained under `skia-source/`. These files and the resolved dependency inventory are evidence, not a claim that the MIT wrapper license covers all native components.
