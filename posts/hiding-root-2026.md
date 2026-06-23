# How to Hide Root on Android: A Simple Guide (2026 Edition)

In the past, hiding root on Android was very simple. Banking apps and games would only search for basic files like `/system/xbin/su`, check if Magisk was installed, or see if system files could be modified.

Today, root detection has changed a lot. Apps now use advanced methods: they scan virtual filesystems, check mount tables, verify hardware signatures, and use Google's Play Integrity API. 

If you want to customize your phone and still use these apps, you need to understand how detection works and how to hide your root setup. Here is a step-by-step guide.

---

## Phase 1: Hiding inside the Kernel (KernelSU / APatch)

Older root tools like Magisk run in "userspace". They use a trick called Zygisk to intercept apps as they open. While this is useful, it leaves clear traces in the phone's mount table (`/proc/self/mountinfo`).

To stay hidden, it is better to work inside the kernel (the core of the operating system). Tools like **KernelSU** and **APatch** modify the kernel itself:
*   **KernelSU:** Puts the root manager directly inside the kernel. It grants root permissions in kernel memory and mounts files systemlessly using OverlayFS.
*   **APatch:** Patches the boot image (`boot.img`) by injecting a tool called KernelPatch, which lets you control the kernel with scripts.

Because these tools run inside the kernel, they can use **Mount Namespace Isolation**. This separates different namespaces so standard apps cannot see the folders where root modules are mounted.

You can decouple mount namespaces inside the shell like this:

```bash
# Separate mount namespaces in an isolated virtual shell
unshare --mount=/proc/1/ns/mnt /system/bin/sh
```

This prevents standard apps from seeing your root files.

---

## Phase 2: Obfuscating the Filesystem with SusFS

Even with namespace isolation, smart detection tools can scan folders or check if file speeds are normal. To stop this, we use **SusFS (Suspicious File System)**. This is a kernel patch that hides files at the filesystem level.

SusFS adds special flags to the kernel's file structure (inodes):
*   `INODE_STATE_SUS_PATH`: Hides files and folders during directory scans.
*   `INODE_STATE_SUS_MOUNT`: Hides mount points from being queried.
*   `INODE_STATE_SUS_KSTAT`: Fakes file details (like size, permissions, and dates) so they look like normal system files.

By using SusFS in your kernel, you can hide your files using simple commands:

```bash
# Hide module folders from directory scans
ksu_susfs add_sus_path /data/adb/modules

# Hide root mount points from mount tables
ksu_susfs add_sus_mount /data/adb/modules

# Make critical modified files look normal
ksu_susfs add_sus_kstat /system/etc/hosts
mount -o bind /data/local/tmp/custom_hosts /system/etc/hosts
ksu_susfs update_sus_kstat /system/etc/hosts
```

---

## Phase 3: Passing Google's Play Integrity Checks

The biggest challenge is Google's **Play Integrity API**. To pass these checks, Google asks your phone's secure hardware (like the Titan chip or KeyMint) to sign a security statement.

Since we cannot change the secure hardware, we cannot force it to say the phone is locked. However, we can use two different methods to bypass this.

### Method A: Falling Back to Software Checks (Fingerprint Spoofing)

For basic integrity checks, Google allows "software-backed" checks. We can trick Google's servers by making our phone pretend to be an older model (like the Nexus 6P) that does not have secure hardware.

We do this by modifying system properties in Google Play Services:

```c
int hooked_system_property_get(const char *name, char *value) {
    if (strcmp(name, "ro.product.model") == 0) {
        strcpy(value, "Nexus 6P");
        return 8;
    }
    if (strcmp(name, "ro.build.fingerprint") == 0) {
        strcpy(value, "google/angler/angler:6.0/MDB08M/2353385:user/release-keys");
        return strlen(value);
    }
    return orig_system_property_get(name, value);
}
```

We also use Java reflection to update static build values so they match.

### Method B: Keybox Injection (TrickyStore)

To pass stronger hardware checks, we can use a tool called **TrickyStore**. Instead of cracking the hardware, TrickyStore intercepts communication between Google Play Services and the hardware keystore.

1. You load a valid, leaked security certificate (a Keybox file) onto your device.
2. When Google Play Services asks the hardware to sign a check, TrickyStore stops the request.
3. It signs the check using the leaked certificate, claiming the bootloader is locked.
4. The signed check is sent back to Google's servers, which verify it as a trusted device.

---

## Phase 4: Your Hiding Checklist

If you are setting up your phone from scratch, follow these steps to keep it hidden:

1. **Flash a Custom Kernel:** Use KernelSU Next or APatch. Make sure your kernel is compiled with **SusFS patches**.
2. **Isolate Mounts:** Enable isolated namespaces in your root manager. If you use Zygisk, use Shamiko to hide hooks.
3. **Use TrickyStore:** Install TrickyStore and drop a working `keybox.xml` file into `/data/adb/tricky_store/` to pass strong checks.
4. **Spoof Device Details:** Use a tool like *Play Integrity Fix* to keep your device properties consistent.
5. **Hide the Manager App:** Open your root manager app settings and choose "Hide the Manager". This rebuilds the app with a random icon and name so apps cannot find it.
