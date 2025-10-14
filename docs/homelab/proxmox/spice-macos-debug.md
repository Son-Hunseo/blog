---
title: MacOS에서 virt-viewer로 SPICE연결이 되지 않는 현상 해결
sidebar_label: "6"
description: MacOS에서 Proxmox SPICE 연결 시 발생하는 remote-viewer 오류 해결 방법을 정리했습니다. Homebrew로 설치한 virt-viewer 환경에서 GTK 라이브러리 충돌(GTK3 vs GTK4, GLib, GObject 등)로 인한 접속 불가 문제를 디버깅하고, 환경변수 및 의존성 정리로 해결한 과정을 다룹니다.
keywords:
  - Proxmox
  - SPICE
  - remote-viewer
  - virt-viewer
  - MacOS
  - MacOS SPICE error
---
---
## 상황

Proxmox로 만든 VM에 SPICE 연결을 해서 접속하려니 윈도우에서는 정상적으로 접속이 되는데, MacOS에서는 오류가 발생하며 접속이 되지 않는 현상이 발생하였다.

레딧이나 Proxmox 공식 포럼 등에서 여러 해결 방법이 있었지만, 해당 방법들은 나와 원인이 달랐는지, 적용되지 않았다.

---
## 디버깅
### 원인 파악

**brew에서 virt-viewer를 설치했다는 가정하에 설명**

```bash
remote-viewer pve-spice.vv
```

- `vv` 파일이 있는 공간에서 위 명령어를 실행하면 원래 연결이 되어야한다.
	- cf) 참고로 `virt-viewer`를 설치하면 `remote-viewer` 명령어도 사용할 수 있다.

```bash
(remote-viewer:85795): virt-viewer-WARNING **: 01:11:14.618: (../src/virt-viewer-window.c:831):accel_key_to_keys: runtime check failed: ((accel_mods & ~(GDK_SHIFT_MASK | GDK_CONTROL_MASK | GDK_MOD1_MASK)) == 0)
```

- 하지만, 터미널에서는 위와 같은 오류 메시지만 반복되었다.

```bash
/opt/homebrew/bin/remote-viewer --spice-debug pve-spice.vv
```

- 자세한 원인을 찾기 위해 디버그 모드로 실행하였다.

```bash
...
Failed to load shared library 'libgobject-2.0.0.dylib' ...
Failed to load shared library 'libglib-2.0.0.dylib' ...

...

objc[...] Class ... is implemented in both ... gtk+3 ... and ... gtk4 ...
```

- 이 오류들을 분석해본 결과 `remote-viewer`(virt-viewer)가 여러 GTK / GStreamer / GLib 라이브러리 버전 충돌로 인해 오류를 생기는 상황이었다.
- 첫번째 `Failed ~` 오류는 GLib / GObject를 못 찾고 있다는 오류이다.
- 두번째 `objc[...] ...` 오류는 GTK3, GTK4 두 버전이 동시에 로드됨을 의미한다. 즉, 이는 충돌이 나는 상황이며 `remote-viewer`가 내부적으로 GTK3을 기대하지만 Homebrew가 GTK4도 끼워 넣은 상황이다.

### 해결

```bash
brew uninstall --ignore-dependencies gtk4
brew reinstall gtk+3 gobject-introspection pygobject3 glib
```

- `remote-viewer`에게 GTK4는 필요하지 않고, GTK3만 있으면 충분하다.
- 따라서 gtk4 삭제

```bash
export PATH="/opt/homebrew/bin:$PATH"
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:/opt/homebrew/share/pkgconfig"
export DYLD_LIBRARY_PATH="/opt/homebrew/lib:$DYLD_LIBRARY_PATH"
```

- 환경변수를 정리해준다.

```bash
remote-viewer pve-spice.vv
```

- 다시 실행해보면 잘 실행되는 것을 볼 수 있다.