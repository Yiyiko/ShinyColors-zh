// ==UserScript==
// @name         偶像大师闪耀色彩 (ShinyColors) 汉化
// @namespace    https://github.com/Yiyiko/ShinyColors-zh
// @version      0.3.3
// @author       Yiyiko
// @description  偶像大师闪耀色彩网页版汉化脚本（PC Firefox + Violentmonkey）。录剧情视频到公开网站请先取得译者同意。
// @license      MIT
// @icon         https://shinycolors.enza.fun/icon_192x192.png
// @source       https://github.com/Yiyiko/ShinyColors-zh.git
// @supportURL   https://github.com/Yiyiko/ShinyColors-zh/issues
// @downloadURL  https://Yiyiko.github.io/ShinyColors-zh/ShinyColors-zh.user.js
// @updateURL    https://Yiyiko.github.io/ShinyColors-zh/ShinyColors-zh.user.js
// @match        https://shinycolors.enza.fun/*
// @connect      Yiyiko.github.io
// @connect      cdn.jsdelivr.net
// @connect      clients5.google.com
// @connect      translate.googleapis.com
// @connect      api.mymemory.translated.net
// @connect      generativelanguage.googleapis.com
// @connect      open.bigmodel.cn
// @connect      api.siliconflow.cn
// @connect      api.deepseek.com
// @connect      opencode.ai
// @connect      openrouter.ai
// @connect      api.openai.com
// @connect      api.interpreter.caiyunai.com
// @connect      127.0.0.1
// @connect      localhost
// @connect      *
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @inject-into  page
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	function installEzgCapture(options = {}) {
		const target = options.targetWindow ?? (typeof window !== "undefined" ? window : globalThis);
		const timeoutMs = options.timeoutMs ?? 3e4;
		const startedAt = Date.now();
		let captured = null;
		let storedValue = target.ezg;
		let settled = false;
		let timer = null;
		let installedDefineProperty = false;
		let originalDescriptor;
		const cleanup = () => {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			if (installedDefineProperty) {
				installedDefineProperty = false;
				try {
					if (originalDescriptor) Object.defineProperty(target, "ezg", originalDescriptor);
					else Object.defineProperty(target, "ezg", {
						configurable: true,
						writable: true,
						enumerable: true,
						value: storedValue
					});
				} catch {}
			}
		};
		let resolveFn;
		const promise = new Promise((resolve) => {
			resolveFn = resolve;
		});
		const finish = (ezg, method) => {
			if (settled) return;
			settled = true;
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			if (ezg) {
				captured = ezg;
				options.onCaptured?.(ezg, method);
			}
			resolveFn({
				ezg,
				method,
				elapsedMs: Date.now() - startedAt
			});
		};
		if (storedValue && typeof storedValue === "object") {
			finish(storedValue, "existing");
			return {
				promise,
				getCurrent: () => captured,
				cleanup
			};
		}
		originalDescriptor = Object.getOwnPropertyDescriptor(target, "ezg");
		if (!originalDescriptor || originalDescriptor.configurable) try {
			Object.defineProperty(target, "ezg", {
				configurable: true,
				enumerable: true,
				get() {
					if (originalDescriptor?.get) return originalDescriptor.get.call(target);
					return storedValue;
				},
				set(value) {
					storedValue = value;
					if (originalDescriptor?.set) originalDescriptor.set.call(target, value);
					if (value && typeof value === "object" && !captured) finish(value, "defineProperty");
				}
			});
			installedDefineProperty = true;
		} catch {}
		timer = setTimeout(() => {
			if (!settled) {
				const latest = target.ezg;
				if (latest && typeof latest === "object") finish(latest, "existing");
				else finish(null, "timeout");
			}
		}, timeoutMs);
		return {
			promise,
			getCurrent: () => captured,
			cleanup
		};
	}
	var WEBPACK_REQUIRE_REGEX = /^function\s+\w+\((\w+)\)\{var\s+(\w+)=(\w+)\[\1\];if\(void\s+0!==\2\)return\s+\2\.exports;var\s+(\w+)=\3\[\1\]=\{id:\1,loaded:!1,exports:\{\}\};return\s+\w+\[\1\]\.call\(\4\.exports,\4,\4\.exports,\w+\),\4\.loaded=!0,\4\.exports\}$/;
	function detectAppBundle(doc) {
		const targetDoc = doc ?? (typeof document !== "undefined" ? document : void 0);
		if (!targetDoc) return null;
		const scripts = targetDoc.querySelectorAll("script[src]");
		for (const el of Array.from(scripts)) {
			const match = (el.getAttribute("src") ?? "").match(/\/?(app-[a-f0-9]+\.js)(?:\?|$)/i);
			if (match) return match[1];
		}
		return null;
	}
	function isWebpackChunkArray(value) {
		if (!Array.isArray(value)) return false;
		if (!Object.prototype.hasOwnProperty.call(value, "push")) return false;
		const ownPush = value.push;
		return typeof ownPush === "function" && ownPush !== Array.prototype.push;
	}
	function isWebpackRequireFn(fn) {
		if (typeof fn !== "function") return false;
		try {
			const src = Function.prototype.toString.call(fn);
			return WEBPACK_REQUIRE_REGEX.test(src);
		} catch {
			return false;
		}
	}
	function scanWebpackChunkVars(globalObj) {
		const found = [];
		for (const key of Object.keys(globalObj)) {
			if (key.startsWith("on") || key === "frames" || key === "window" || key === "self") continue;
			let val;
			try {
				val = globalObj[key];
			} catch {
				continue;
			}
			if (isWebpackChunkArray(val)) found.push(key);
		}
		return found;
	}
	function installRequireCapture(options = {}) {
		const globalObj = options.globalObj ?? (typeof window !== "undefined" ? window : globalThis);
		const timeoutMs = options.timeoutMs ?? 3e4;
		const pollIntervalMs = options.pollIntervalMs ?? 50;
		const enableCallProxy = options.enableCallProxy ?? true;
		const startedAt = Date.now();
		let captured = null;
		let settled = false;
		let pollTimer = null;
		let timeoutTimer = null;
		const triedChunkVars = new Set();
		const originCall = Function.prototype.call;
		let callProxyActive = false;
		const restoreCallProxy = () => {
			if (callProxyActive) {
				callProxyActive = false;
				Function.prototype.call = originCall;
			}
		};
		const cleanup = () => {
			restoreCallProxy();
			if (pollTimer !== null) {
				clearInterval(pollTimer);
				pollTimer = null;
			}
			if (timeoutTimer !== null) {
				clearTimeout(timeoutTimer);
				timeoutTimer = null;
			}
		};
		let resolveFn;
		const promise = new Promise((resolve) => {
			resolveFn = resolve;
		});
		const finish = (req, method, chunkVar) => {
			if (settled) return;
			settled = true;
			captured = req;
			cleanup();
			resolveFn({
				require: req,
				method,
				chunkVar: chunkVar ?? scanWebpackChunkVars(globalObj)[0] ?? null,
				appBundle: detectAppBundle(options.documentObj),
				elapsedMs: Date.now() - startedAt
			});
		};
		const tryInjectChunks = (method) => {
			const vars = scanWebpackChunkVars(globalObj);
			for (const key of vars) {
				if (triedChunkVars.has(key)) continue;
				triedChunkVars.add(key);
				const arr = globalObj[key];
				if (!isWebpackChunkArray(arr)) continue;
				try {
					const chunkId = `sczh_cap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
					arr.push([
						[chunkId],
						{},
						(req) => {
							if (typeof req === "function" && !settled) finish(req, method, key);
						}
					]);
					if (settled) return true;
				} catch {}
			}
			return settled;
		};
		if (tryInjectChunks("chunk-existing")) return {
			promise,
			getCurrent: () => captured,
			cleanup
		};
		if (enableCallProxy) {
			const reflectApply = Reflect.apply;
			callProxyActive = true;
			Function.prototype.call = new Proxy(originCall, { apply(target, thisArg, argArray) {
				if (!settled && argArray.length >= 4 && typeof argArray[3] === "function") {
					const candidate = argArray[3];
					if (isWebpackRequireFn(candidate)) finish(candidate, "call-proxy", null);
				}
				return reflectApply(target, thisArg, argArray);
			} });
		}
		pollTimer = setInterval(() => {
			if (settled) {
				cleanup();
				return;
			}
			tryInjectChunks("chunk-poll");
		}, pollIntervalMs);
		timeoutTimer = setTimeout(() => {
			if (!settled) finish(null, "timeout", null);
		}, timeoutMs);
		return {
			promise,
			getCurrent: () => captured,
			cleanup
		};
	}
	var DB_NAME = "sczh-cache-v1";
	var STORE_NAME = "entries";
	var MemoryCache = class {
		store = new Map();
		async get(key) {
			return this.store.get(key) ?? null;
		}
		async set(key, hash, value) {
			this.store.set(key, {
				key,
				hash,
				value,
				updatedAt: Date.now()
			});
		}
		async delete(key) {
			this.store.delete(key);
		}
		async clear() {
			this.store.clear();
		}
	};
	var IndexedDbCache = class {
		dbName;
		dbPromise = null;
		fallback = new MemoryCache();
		constructor(dbName = DB_NAME) {
			this.dbName = dbName;
		}
		open() {
			if (typeof indexedDB === "undefined") return null;
			if (!this.dbPromise) this.dbPromise = new Promise((resolve, reject) => {
				const req = indexedDB.open(this.dbName, 1);
				req.onupgradeneeded = () => {
					const db = req.result;
					if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "key" });
				};
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			return this.dbPromise;
		}
		async get(key) {
			const dbP = this.open();
			if (!dbP) return this.fallback.get(key);
			try {
				const db = await dbP;
				return await new Promise((resolve, reject) => {
					const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
					req.onsuccess = () => resolve(req.result ?? null);
					req.onerror = () => reject(req.error);
				});
			} catch {
				return this.fallback.get(key);
			}
		}
		async set(key, hash, value) {
			const entry = {
				key,
				hash,
				value,
				updatedAt: Date.now()
			};
			const dbP = this.open();
			if (!dbP) return this.fallback.set(key, hash, value);
			try {
				const db = await dbP;
				await new Promise((resolve, reject) => {
					const tx = db.transaction(STORE_NAME, "readwrite");
					tx.objectStore(STORE_NAME).put(entry);
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
			} catch {
				await this.fallback.set(key, hash, value);
			}
		}
		async delete(key) {
			const dbP = this.open();
			if (!dbP) return this.fallback.delete(key);
			try {
				const db = await dbP;
				await new Promise((resolve, reject) => {
					const tx = db.transaction(STORE_NAME, "readwrite");
					tx.objectStore(STORE_NAME).delete(key);
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
			} catch {
				await this.fallback.delete(key);
			}
		}
		async clear() {
			await this.fallback.clear();
			const dbP = this.open();
			if (!dbP) return;
			try {
				const db = await dbP;
				await new Promise((resolve, reject) => {
					const tx = db.transaction(STORE_NAME, "readwrite");
					tx.objectStore(STORE_NAME).clear();
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
			} catch {}
		}
	};
	var import_papaparse_min = __toESM(__commonJSMin(((exports, module, this$1) => {
		var define;
		((e, t) => {
			"function" == typeof define && define.amd ? define([], t) : "object" == typeof module && "undefined" != typeof exports ? module.exports = t() : e.Papa = t();
		})(this$1, function r() {
			var n = "undefined" != typeof self ? self : "undefined" != typeof window ? window : void 0 !== n ? n : {};
			var s = !n.document && !!n.postMessage, a = n.IS_PAPA_WORKER || !1, o = {}, h = 0, w = {};
			function q(e) {
				return 65279 === e.charCodeAt(0) ? e.slice(1) : e;
			}
			function u(e) {
				this._handle = null, this._finished = !1, this._completed = !1, this._halted = !1, this._input = null, this._baseIndex = 0, this._partialLine = "", this._rowCount = 0, this._start = 0, this._nextChunk = null, this.isFirstChunk = !0, this._completeResults = {
					data: [],
					errors: [],
					meta: {}
				}, function(e) {
					var t = E(e);
					t.chunkSize = parseInt(t.chunkSize), e.step || e.chunk || (t.chunkSize = null);
					this._handle = new i(t), (this._handle.streamer = this)._config = t;
				}.call(this, e), this.parseChunk = function(t, e) {
					var i = parseInt(this._config.skipFirstNLines) || 0;
					if (this.isFirstChunk && 0 < i) {
						let e = this._config.newline;
						e || (r = this._config.quoteChar || "\"", e = this._handle.guessLineEndings(t, r)), t = [...t.split(e).slice(i)].join(e);
					}
					this.isFirstChunk && U(this._config.beforeFirstChunk) && void 0 !== (r = this._config.beforeFirstChunk(t)) && (t = r), this.isFirstChunk = !1, this._halted = !1;
					var i = this._partialLine + t, r = (this._partialLine = "", this._handle.parse(i, this._baseIndex, !this._finished));
					if (!this._handle.paused() && !this._handle.aborted()) {
						t = r.meta.cursor, i = (this._finished || (this._partialLine = i.substring(t - this._baseIndex), this._baseIndex = t), r && r.data && (this._rowCount += r.data.length), this._finished || this._config.preview && this._rowCount >= this._config.preview);
						if (a) n.postMessage({
							results: r,
							workerId: w.WORKER_ID,
							finished: i
						});
						else if (U(this._config.chunk) && !e) {
							if (this._config.chunk(r, this._handle), this._handle.paused() || this._handle.aborted()) return void (this._halted = !0);
							this._completeResults = r = void 0;
						}
						return this._config.step || this._config.chunk || (this._completeResults.data = this._completeResults.data.concat(r.data), this._completeResults.errors = this._completeResults.errors.concat(r.errors), this._completeResults.meta = r.meta), this._completed || !i || !U(this._config.complete) || r && r.meta.aborted || (this._config.complete(this._completeResults, this._input), this._completed = !0), i || r && r.meta.paused || this._nextChunk(), r;
					}
					this._halted = !0;
				}, this._sendError = function(e) {
					U(this._config.error) ? this._config.error(e) : a && this._config.error && n.postMessage({
						workerId: w.WORKER_ID,
						error: e,
						finished: !1
					});
				};
			}
			function d(e) {
				var r;
				(e = e || {}).chunkSize || (e.chunkSize = w.RemoteChunkSize), u.call(this, e), this._nextChunk = s ? function() {
					this._readChunk(), this._chunkLoaded();
				} : function() {
					this._readChunk();
				}, this.stream = function(e) {
					this._input = e, this._nextChunk();
				}, this._readChunk = function() {
					if (this._finished) this._chunkLoaded();
					else {
						if (r = new XMLHttpRequest(), this._config.withCredentials && (r.withCredentials = this._config.withCredentials), s || (r.onload = m(this._chunkLoaded, this), r.onerror = m(this._chunkError, this)), r.ontimeout = m(this._chunkTimeout, this), r.open(this._config.downloadRequestBody ? "POST" : "GET", this._input, !s), this._config.downloadTimeout && !s && (r.timeout = this._config.downloadTimeout), this._config.downloadRequestHeaders) {
							var e, t = this._config.downloadRequestHeaders;
							for (e in t) r.setRequestHeader(e, t[e]);
						}
						var i;
						this._config.chunkSize && (i = this._start + this._config.chunkSize - 1, r.setRequestHeader("Range", "bytes=" + this._start + "-" + i));
						try {
							r.send(this._config.downloadRequestBody);
						} catch (e) {
							this._chunkError(e.message);
						}
						s && 0 === r.status && this._chunkError();
					}
				}, this._chunkLoaded = function() {
					4 === r.readyState && (r.status < 200 || 400 <= r.status ? this._chunkError() : (this._start += this._config.chunkSize || r.responseText.length, this._finished = !this._config.chunkSize || this._start >= ((e) => null !== (e = e.getResponseHeader("Content-Range")) ? parseInt(e.substring(e.lastIndexOf("/") + 1)) : -1)(r), this.parseChunk(r.responseText)));
				}, this._chunkError = function(e) {
					e = r.statusText || e;
					this._sendError(new Error(e));
				}, this._chunkTimeout = function() {
					this._chunkError("Request timed out after " + this._config.downloadTimeout + "ms");
				};
			}
			function l(e) {
				(e = e || {}).chunkSize || (e.chunkSize = w.LocalChunkSize), u.call(this, e);
				var i, r, n = "undefined" != typeof FileReader;
				this.stream = function(e) {
					this._input = e, r = e.slice || e.webkitSlice || e.mozSlice, n ? ((i = new FileReader()).onload = m(this._chunkLoaded, this), i.onerror = m(this._chunkError, this)) : i = new FileReaderSync(), this._nextChunk();
				}, this._nextChunk = function() {
					this._finished || this._config.preview && !(this._rowCount < this._config.preview) || this._readChunk();
				}, this._readChunk = function() {
					var e = this._input, t = (this._config.chunkSize && (t = Math.min(this._start + this._config.chunkSize, this._input.size), e = r.call(e, this._start, t)), i.readAsText(e, this._config.encoding));
					n || this._chunkLoaded({ target: { result: t } });
				}, this._chunkLoaded = function(e) {
					this._start += this._config.chunkSize, this._finished = !this._config.chunkSize || this._start >= this._input.size, this.parseChunk(e.target.result);
				}, this._chunkError = function() {
					this._sendError(i.error);
				};
			}
			function f(e) {
				var i;
				u.call(this, e = e || {}), this.stream = function(e) {
					return i = e, this._nextChunk();
				}, this._nextChunk = function() {
					var e, t;
					if (!this._finished) return e = this._config.chunkSize, i = e ? (t = i.substring(0, e), i.substring(e)) : (t = i, ""), this._finished = !i, this.parseChunk(t);
				};
			}
			function c(e) {
				u.call(this, e = e || {});
				var t = [], i = !0, r = !1;
				this.pause = function() {
					u.prototype.pause.apply(this, arguments), this._input.pause();
				}, this.resume = function() {
					u.prototype.resume.apply(this, arguments), this._input.resume();
				}, this.stream = function(e) {
					this._input = e, this._input.on("data", this._streamData), this._input.on("end", this._streamEnd), this._input.on("error", this._streamError);
				}, this._checkIsFinished = function() {
					r && 1 === t.length && (this._finished = !0);
				}, this._nextChunk = function() {
					this._checkIsFinished(), t.length ? this.parseChunk(t.shift()) : i = !0;
				}, this._streamData = m(function(e) {
					try {
						t.push("string" == typeof e ? e : e.toString(this._config.encoding)), i && (i = !1, this._checkIsFinished(), this.parseChunk(t.shift()));
					} catch (e) {
						this._streamError(e);
					}
				}, this), this._streamError = m(function(e) {
					this._streamCleanUp(), this._sendError(e);
				}, this), this._streamEnd = m(function() {
					this._streamCleanUp(), r = !0, this._streamData("");
				}, this), this._streamCleanUp = m(function() {
					this._input.removeListener("data", this._streamData), this._input.removeListener("end", this._streamEnd), this._input.removeListener("error", this._streamError);
				}, this);
			}
			function i(m) {
				var n, s, a, t, o = Math.pow(2, 53), h = -o, u = /^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/, d = /^((\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)))$/, i = this, r = 0, l = 0, f = !1, e = !1, c = [], p = {
					data: [],
					errors: [],
					meta: {}
				};
				function y(e) {
					return "greedy" === m.skipEmptyLines ? "" === e.join("").trim() : 1 === e.length && 0 === e[0].length;
				}
				function _() {
					if (p && a && (k("Delimiter", "UndetectableDelimiter", "Unable to auto-detect delimiting character; defaulted to '" + w.DefaultDelimiter + "'"), a = !1), m.skipEmptyLines && (p.data = p.data.filter(function(e) {
						return !y(e);
					})), g()) {
						if (p) if (Array.isArray(p.data[0])) {
							for (var e = 0; g() && e < p.data.length; e++) p.data[e].forEach(t);
							p.data.splice(0, 1);
						} else p.data.forEach(t);
						function t(e) {
							c.push(e);
						}
					}
					function i(e, t) {
						for (var i = m.header ? {} : [], r = 0; r < e.length; r++) {
							var n = r, s = e[r], s = ((e, t) => ((e) => (m.dynamicTypingFunction && void 0 === m.dynamicTyping[e] && (m.dynamicTyping[e] = m.dynamicTypingFunction(e)), !0 === (m.dynamicTyping[e] || m.dynamicTyping)))(e) ? "true" === t || "TRUE" === t || "false" !== t && "FALSE" !== t && (((e) => {
								if (u.test(e)) {
									e = parseFloat(e);
									if (h < e && e < o) return 1;
								}
							})(t) ? parseFloat(t) : d.test(t) ? new Date(t) : "" === t ? null : t) : t)(n = m.header ? r >= c.length ? "__parsed_extra" : c[r] : n, s = m.transform ? m.transform(s, n) : s);
							"__parsed_extra" === n ? (i[n] = i[n] || [], i[n].push(s)) : i[n] = s;
						}
						return m.header && (r > c.length ? k("FieldMismatch", "TooManyFields", "Too many fields: expected " + c.length + " fields but parsed " + r, l + t) : r < c.length && k("FieldMismatch", "TooFewFields", "Too few fields: expected " + c.length + " fields but parsed " + r, l + t)), i;
					}
					var r;
					p && (m.header || m.dynamicTyping || m.transform) && (r = 1, !p.data.length || Array.isArray(p.data[0]) ? (p.data = p.data.map(i), r = p.data.length) : p.data = i(p.data, 0), m.header && p.meta && (p.meta.fields = c), l += r);
				}
				function g() {
					return m.header && 0 === c.length;
				}
				function k(e, t, i, r) {
					e = {
						type: e,
						code: t,
						message: i
					};
					void 0 !== r && (e.row = r), p.errors.push(e);
				}
				U(m.step) && (t = m.step, m.step = function(e) {
					p = e, g() ? _() : (_(), 0 !== p.data.length && (r += e.data.length, m.preview && r > m.preview ? s.abort() : (p.data = p.data[0], t(p, i))));
				}), this.parse = function(e, t, i) {
					var r = m.quoteChar || "\"", r = (m.newline || (m.newline = this.guessLineEndings(e, r)), a = !1, m.delimiter ? U(m.delimiter) && (m.delimiter = m.delimiter(e), p.meta.delimiter = m.delimiter) : ((r = ((e, t, i, r, n) => {
						var s, a, o, h;
						n = n || [
							",",
							"	",
							"|",
							";",
							w.RECORD_SEP,
							w.UNIT_SEP
						];
						for (var u = 0; u < n.length; u++) {
							for (var d, l = n[u], f = 0, c = 0, p = 0, _ = (o = void 0, new b({
								comments: r,
								delimiter: l,
								newline: t,
								preview: 10
							}).parse(e)), g = 0; g < _.data.length; g++) i && y(_.data[g]) ? p++ : (d = _.data[g].length, c += d, void 0 === o ? o = d : 0 < d && (f += Math.abs(d - o), o = d));
							0 < _.data.length && (c /= _.data.length - p), 1.99 < c && (void 0 === a || f < a || f === a && h < c) && (a = f, s = l, h = c);
						}
						return {
							successful: !!(m.delimiter = s),
							bestDelimiter: s
						};
					})(e, m.newline, m.skipEmptyLines, m.comments, m.delimitersToGuess)).successful ? m.delimiter = r.bestDelimiter : (a = !0, m.delimiter = w.DefaultDelimiter), p.meta.delimiter = m.delimiter), E(m));
					return r.header = g(), m.preview && m.header && r.preview++, n = e, s = new b(r), p = s.parse(n, t, i), _(), f ? { meta: { paused: !0 } } : p || { meta: { paused: !1 } };
				}, this.paused = function() {
					return f;
				}, this.pause = function() {
					f = !0, s.abort(), n = U(m.chunk) ? "" : n.substring(s.getCharIndex());
				}, this.resume = function() {
					i.streamer._halted ? (f = !1, i.streamer.parseChunk(n, !0)) : setTimeout(i.resume, 3);
				}, this.aborted = function() {
					return e;
				}, this.abort = function() {
					e = !0, s.abort(), p.meta.aborted = !0, U(m.complete) && m.complete(p), n = "";
				}, this.guessLineEndings = function(e, t) {
					e = e.substring(0, 1048576);
					var t = new RegExp(P(t) + "([^]*?)" + P(t), "gm"), i = (e = e.replace(t, "")).split("\r"), t = e.split("\n"), e = 1 < t.length && t[0].length < i[0].length;
					if (1 === i.length || e) return "\n";
					for (var r = 0, n = 0; n < i.length; n++) "\n" === i[n][0] && r++;
					return r >= i.length / 2 ? "\r\n" : "\r";
				};
			}
			function P(e) {
				return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			}
			function b(C) {
				var S = (C = C || {}).delimiter, O = C.newline, x = C.comments, T = C.step, I = C.preview, A = C.fastMode, D = null, L = !1, F = null == C.quoteChar ? "\"" : C.quoteChar, z = F;
				if (void 0 !== C.escapeChar && (z = C.escapeChar), ("string" != typeof S || -1 < w.BAD_DELIMITERS.indexOf(S)) && (S = ","), x === S) throw new Error("Comment character same as delimiter");
				!0 === x ? x = "#" : ("string" != typeof x || -1 < w.BAD_DELIMITERS.indexOf(x)) && (x = !1), "\n" !== O && "\r" !== O && "\r\n" !== O && (O = "\n");
				var M = 0, j = !1;
				this.parse = function(i, t, r) {
					if ("string" != typeof i) throw new Error("Input must be a string");
					var n = i.length, e = S.length, s = O.length, a = x.length, o = U(T), h = [], u = [], d = [], l = M = 0;
					if (!i) return v();
					if (A || !1 !== A && -1 === i.indexOf(F)) {
						for (var f = i.split(O), c = 0; c < f.length; c++) {
							if (d = f[c], M += d.length, c !== f.length - 1) M += O.length;
							else if (r) return v();
							if (!x || d.substring(0, a) !== x) {
								if (o) {
									if (h = [], k(d.split(S)), R(), j) return v();
								} else k(d.split(S));
								if (I && I <= c) return h = h.slice(0, I), v(!0);
							}
						}
						return v();
					}
					for (var p = i.indexOf(S, M), _ = i.indexOf(O, M), g = new RegExp(P(z) + P(F), "g"), m = i.indexOf(F, M);;) if (i[M] === F) for (m = M, M++;;) {
						if (-1 === (m = i.indexOf(F, m + 1))) return r || u.push({
							type: "Quotes",
							code: "MissingQuotes",
							message: "Quoted field unterminated",
							row: h.length,
							index: M
						}), b();
						if (m === n - 1) return b(i.substring(M, m).replace(g, F));
						if (F === z && i[m + 1] === z) m++;
						else if (F === z || 0 === m || i[m - 1] !== z) {
							-1 !== p && p < m + 1 && (p = i.indexOf(S, m + 1));
							var y = w(-1 === (_ = -1 !== _ && _ < m + 1 ? i.indexOf(O, m + 1) : _) ? p : Math.min(p, _));
							if (i.substr(m + 1 + y, e) === S) {
								d.push(i.substring(M, m).replace(g, F)), i[M = m + 1 + y + e] !== F && (m = i.indexOf(F, M)), -1 !== p && p < M && (p = i.indexOf(S, M)), -1 !== _ && _ < M && (_ = i.indexOf(O, M));
								break;
							}
							y = w(_);
							if (i.substring(m + 1 + y, m + 1 + y + s) === O) {
								if (d.push(i.substring(M, m).replace(g, F)), E(m + 1 + y + s), -1 !== p && p < M && (p = i.indexOf(S, M)), m = i.indexOf(F, M), o && (R(), j)) return v();
								if (I && h.length >= I) return v(!0);
								break;
							}
							u.push({
								type: "Quotes",
								code: "InvalidQuotes",
								message: "Trailing quote on quoted field is malformed",
								row: h.length,
								index: M
							}), m++;
						}
					}
					else if (x && 0 === d.length && i.substring(M, M + a) === x) {
						if (-1 === _) return v();
						M = _ + s, _ = i.indexOf(O, M), -1 !== p && p < M && (p = i.indexOf(S, M));
					} else if (-1 !== p && (p < _ || -1 === _)) d.push(i.substring(M, p)), M = p + e, p = i.indexOf(S, M);
					else {
						if (-1 === _) break;
						if (d.push(i.substring(M, _)), E(_ + s), o && (R(), j)) return v();
						if (I && h.length >= I) return v(!0);
					}
					return b();
					function k(e) {
						h.push(e), l = M;
					}
					function w(e) {
						var t = 0;
						return t = -1 !== e && (e = i.substring(m + 1, e)) && "" === e.trim() ? e.length : t;
					}
					function b(e) {
						return r || (void 0 === e && (e = i.substring(M)), d.push(e), M = n, k(d), o && R()), v();
					}
					function E(e) {
						M = e, k(d), d = [], _ = i.indexOf(O, M);
					}
					function v(e) {
						if (C.header && !t && h.length && !L) {
							var s = h[0], a = Object.create(null), o = new Set(s);
							let n = !1;
							for (let r = 0; r < s.length; r++) {
								let i = q(s[r]);
								if (a[i = U(C.transformHeader) ? C.transformHeader(i, r) : i]) {
									let e, t = a[i];
									for (; e = i + "_" + t, t++, o.has(e););
									o.add(e), s[r] = e, a[i]++, n = !0, (D = null === D ? {} : D)[e] = i;
								} else a[i] = 1, s[r] = i;
								o.add(i);
							}
							n && console.warn("Duplicate headers found and renamed."), L = !0;
						}
						return {
							data: h,
							errors: u,
							meta: {
								delimiter: S,
								linebreak: O,
								aborted: j,
								truncated: !!e,
								cursor: l + (t || 0),
								renamedHeaders: D
							}
						};
					}
					function R() {
						T(v()), h = [], u = [];
					}
				}, this.abort = function() {
					j = !0;
				}, this.getCharIndex = function() {
					return M;
				};
			}
			function p(e) {
				var t = e.data, i = o[t.workerId], r = !1;
				if (t.error) i.userError(t.error, t.file);
				else if (t.results && t.results.data) {
					var n = {
						abort: function() {
							r = !0, _(t.workerId, {
								data: [],
								errors: [],
								meta: { aborted: !0 }
							});
						},
						pause: g,
						resume: g
					};
					if (U(i.userStep)) {
						for (var s = 0; s < t.results.data.length && (i.userStep({
							data: t.results.data[s],
							errors: t.results.errors,
							meta: t.results.meta
						}, n), !r); s++);
						delete t.results;
					} else U(i.userChunk) && (i.userChunk(t.results, n, t.file), delete t.results);
				}
				t.finished && !r && _(t.workerId, t.results);
			}
			function _(e, t) {
				var i = o[e];
				U(i.userComplete) && i.userComplete(t), i.terminate(), delete o[e];
			}
			function g() {
				throw new Error("Not implemented.");
			}
			function E(e) {
				if ("object" != typeof e || null === e) return e;
				var t, i = Array.isArray(e) ? [] : {};
				for (t in e) i[t] = E(e[t]);
				return i;
			}
			function m(e, t) {
				return function() {
					e.apply(t, arguments);
				};
			}
			function U(e) {
				return "function" == typeof e;
			}
			return w.parse = function(e, t) {
				var i = (t = t || {}).dynamicTyping || !1;
				U(i) && (t.dynamicTypingFunction = i, i = {});
				if (t.dynamicTyping = i, t.transform = !!U(t.transform) && t.transform, void 0 !== t.downloadTimeout) {
					var i = parseInt(t.downloadTimeout);
					if (isNaN(i)) throw new Error("Config downloadTimeout value (" + t.downloadTimeout + ") not parsable by parseInt(val).");
					t.downloadTimeout = i;
				}
				if (!t.worker || !w.WORKERS_SUPPORTED) return i = null, w.NODE_STREAM_INPUT, "string" == typeof e ? (e = q(e), i = new (t.download ? d : f)(t)) : !0 === e.readable && U(e.read) && U(e.on) ? i = new c(t) : (n.File && e instanceof File || e instanceof Object) && (i = new l(t)), i.stream(e);
				(i = (() => {
					var e;
					return !!w.WORKERS_SUPPORTED && (e = (() => {
						var e = n.URL || n.webkitURL || null, t = r.toString();
						return w.BLOB_URL || (w.BLOB_URL = e.createObjectURL(new Blob([
							"var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ",
							"(",
							t,
							")();"
						], { type: "text/javascript" })));
					})(), (e = new n.Worker(e)).onmessage = p, e.id = h++, o[e.id] = e);
				})()).userStep = t.step, i.userChunk = t.chunk, i.userComplete = t.complete, i.userError = t.error, t.step = U(t.step), t.chunk = U(t.chunk), t.complete = U(t.complete), t.error = U(t.error), delete t.worker, i.postMessage({
					input: e,
					config: t,
					workerId: i.id
				});
			}, w.unparse = function(e, t) {
				var s = !1, g = !0, m = ",", y = "\r\n", a = "\"", o = a + a, i = !1, r = null, h = !1, u = ((() => {
					if ("object" == typeof t) {
						if ("string" != typeof t.delimiter || w.BAD_DELIMITERS.filter(function(e) {
							return -1 !== t.delimiter.indexOf(e);
						}).length || (m = t.delimiter), "boolean" != typeof t.quotes && "function" != typeof t.quotes && !Array.isArray(t.quotes) || (s = t.quotes), "boolean" != typeof t.skipEmptyLines && "string" != typeof t.skipEmptyLines || (i = t.skipEmptyLines), "string" == typeof t.newline && (y = t.newline), "string" == typeof t.quoteChar && (a = t.quoteChar, o = a + a), "boolean" == typeof t.header && (g = t.header), Array.isArray(t.columns)) {
							if (0 === t.columns.length) throw new Error("Option columns is empty");
							r = t.columns;
						}
						void 0 !== t.escapeChar && (o = t.escapeChar + a), t.escapeFormulae instanceof RegExp ? h = t.escapeFormulae : "boolean" == typeof t.escapeFormulae && t.escapeFormulae && (h = /^[=+\-@\t\r].*$/);
					}
				})(), new RegExp(P(a), "g"));
				"string" == typeof e && (e = JSON.parse(e));
				if (Array.isArray(e)) {
					if (!e.length) return n(r, e, i);
					if (Array.isArray(e[0])) return n(null, e, i);
					if ("object" == typeof e[0]) return n(r || Object.keys(e[0]), e, i);
				} else if ("object" == typeof e) return "string" == typeof e.data && (e.data = JSON.parse(e.data)), Array.isArray(e.data) && (e.fields || (e.fields = e.meta && e.meta.fields || r), e.fields || (e.fields = Array.isArray(e.data[0]) ? e.fields : "object" == typeof e.data[0] ? Object.keys(e.data[0]) : []), Array.isArray(e.data[0]) || "object" == typeof e.data[0] || (e.data = [e.data])), n(e.fields || [], e.data || [], i);
				throw new Error("Unable to serialize unrecognized input");
				function n(e, t, i) {
					var r = "", n = ("string" == typeof e && (e = JSON.parse(e)), "string" == typeof t && (t = JSON.parse(t)), Array.isArray(e) && 0 < e.length), s = !Array.isArray(t[0]);
					if (n && g) {
						for (var a = 0; a < e.length; a++) 0 < a && (r += m), r += k(e[a], a);
						0 < t.length && (r += y);
					}
					for (var o = 0; o < t.length; o++) {
						var h = (n ? e : t[o]).length, u = !1, d = n ? 0 === Object.keys(t[o]).length : 0 === t[o].length;
						if (i && !n && (u = "greedy" === i ? "" === t[o].join("").trim() : 1 === t[o].length && (null == t[o][0] || 0 === t[o][0].length)), "greedy" === i && n) {
							for (var l = [], f = 0; f < h; f++) {
								var c = s ? e[f] : f;
								l.push(t[o][c]);
							}
							u = "" === l.join("").trim();
						}
						if (!u) {
							for (var p = 0; p < h; p++) {
								0 < p && !d && (r += m);
								var _ = n && s ? e[p] : p;
								r += k(t[o][_], p);
							}
							o < t.length - 1 && (!i || 0 < h && !d) && (r += y);
						}
					}
					return r;
				}
				function k(e, t) {
					var i, r, n;
					return null == e ? "" : e.constructor === Date ? isNaN(e.getTime()) ? "" : e.toISOString() : (n = !1, i = e.toString(), h && "number" != typeof e && "bigint" != typeof e && "boolean" != typeof e && h.test(i) && (e = i = "'" + i, n = !0), r = i.replace(u, o), (n = n || !0 === s || "function" == typeof s && s(e, t) || Array.isArray(s) && s[t] || ((e, t) => {
						for (var i = 0; i < t.length; i++) if (-1 < e.indexOf(t[i])) return !0;
						return !1;
					})(r, w.BAD_DELIMITERS) || -1 < r.indexOf(m) || -1 < i.indexOf(a) || " " === r.charAt(0) || " " === r.charAt(r.length - 1)) ? a + r + a : r);
				}
			}, w.RECORD_SEP = String.fromCharCode(30), w.UNIT_SEP = String.fromCharCode(31), w.BYTE_ORDER_MARK = "﻿", w.BAD_DELIMITERS = [
				"\r",
				"\n",
				"\"",
				w.BYTE_ORDER_MARK
			], w.WORKERS_SUPPORTED = !s && !!n.Worker, w.NODE_STREAM_INPUT = 1, w.LocalChunkSize = 0xa00000, w.RemoteChunkSize = 5242880, w.DefaultDelimiter = ",", w.Parser = b, w.ParserHandle = i, w.NetworkStreamer = d, w.FileStreamer = l, w.StringStreamer = f, w.ReadableStreamStreamer = c, a && (n.onmessage = function(e) {
				e = e.data;
				void 0 === w.WORKER_ID && e && (w.WORKER_ID = e.workerId);
				"string" == typeof e.input ? n.postMessage({
					workerId: w.WORKER_ID,
					results: w.parse(e.input, e.config),
					finished: !0
				}) : (n.File && e.input instanceof File || e.input instanceof Object) && (e = w.parse(e.input, e.config)) && n.postMessage({
					workerId: w.WORKER_ID,
					results: e,
					finished: !0
				});
			}), (d.prototype = Object.create(u.prototype)).constructor = d, (l.prototype = Object.create(u.prototype)).constructor = l, (f.prototype = Object.create(f.prototype)).constructor = f, (c.prototype = Object.create(u.prototype)).constructor = c, w;
		});
	}))(), 1);
	var STORY_PATH_PREFIXES = [
		"produce_events/",
		"produce_communications/",
		"produce_communications_promises/",
		"produce_communication_promise_results/",
		"game_event_communications/",
		"special_communications/",
		"character_special_communications/",
		"mypage_communications/",
		"produce_communication_cheers/",
		"produce_communication_auditions/",
		"produce_communication_televisions/",
		"business_unit_communication/",
		"poker_produce_events/"
	];
	function trimSpaces(str) {
		if (!str) return "";
		return str.replace(/^[ ]+|[ ]+$/g, "");
	}
	function decodeCsvNewlines(str, preserveDouble = false) {
		const decoded = trimSpaces(str).replace(/(\\r)?\\n/g, "\n").replace(/\\r/g, "\n");
		return preserveDouble ? decoded : decoded.replace(/\n{2,}/g, "\n");
	}
	function encodeCsvNewlines(str) {
		if (!str) return "";
		return str.replace(/\r?\n/g, "\\n").replace(/\r/g, "\\n");
	}
	function normalizeLookupText(str) {
		return trimSpaces(str).replace(/\r\n?/g, "\n").replace(/\n{2,}/g, "\n");
	}
	function stripBom(text) {
		return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
	}
	function normalizeStoryPath(rawPath) {
		return rawPath.trim().replace(/^\/+/, "").replace(/^assets\/json\//, "");
	}
	function isStoryPath(rawPath) {
		const norm = normalizeStoryPath(rawPath);
		return STORY_PATH_PREFIXES.some((prefix) => norm.startsWith(prefix));
	}
	function isZeroPlaceholderId(id) {
		return !id || /^0+$/.test(id.trim());
	}
	function createUniqueStoryIdGenerator() {
		const counts = new Map();
		return (rawId) => {
			const id = rawId ? String(rawId).trim() : "";
			if (id && !isZeroPlaceholderId(id) && id !== "select") {
				if (counts.has(id)) {
					const count = counts.get(id);
					counts.set(id, count + 1);
					return `${id}-${count}`;
				}
				counts.set(id, 0);
			}
			return id;
		};
	}
	function parseStoryCsv(csvText) {
		const clean = stripBom(csvText);
		const parsed = import_papaparse_min.default.parse(clean, {
			header: true,
			skipEmptyLines: true
		});
		const byId = new Map();
		const byText = new Map();
		const bySelect = new Map();
		const textCounts = new Map();
		const nextId = createUniqueStoryIdGenerator();
		let infoPath = null;
		let translator = "";
		let rowCount = 0;
		for (const row of parsed.data) {
			const rawId = trimSpaces(row.id);
			const rawName = trimSpaces(row.name);
			const rawText = row.text ?? "";
			const rawTrans = row.trans ?? "";
			if (rawId === "info") {
				if (rawName) infoPath = normalizeStoryPath(rawName);
				continue;
			}
			if (rawId === "译者" || rawId === "translator") {
				if (rawName) translator = rawName;
				continue;
			}
			const normText = normalizeLookupText(decodeCsvNewlines(rawText, false));
			const trans = decodeCsvNewlines(rawTrans, true);
			if (rawId === "select") {
				rowCount += 1;
				if (normText && trans) bySelect.set(normText, trans);
				continue;
			}
			if (!normText && !rawId) continue;
			rowCount += 1;
			if (!trans) continue;
			if (!isZeroPlaceholderId(rawId)) {
				const uniqueId = nextId(rawId);
				byId.set(uniqueId, trans);
			}
			if (normText) {
				const occ = textCounts.get(normText) ?? 0;
				textCounts.set(normText, occ + 1);
				if (occ === 0) byText.set(normText, trans);
				byText.set(`${normText}#${occ}`, trans);
			}
		}
		const isAI = /^AI(?:\(|$|\s)/i.test(translator);
		return {
			infoPath,
			translator,
			isAI,
			byId,
			byText,
			bySelect,
			rowCount
		};
	}
	function exportStoryToCsv(entries, infoPath, translator = "") {
		const rows = [];
		for (const item of entries) {
			const text = trimSpaces(encodeCsvNewlines(item.text));
			if (text) rows.push({
				id: item.id !== void 0 && item.id !== null && String(item.id).trim() !== "" ? String(item.id).trim() : "0000000000000",
				name: trimSpaces(item.speaker),
				text,
				trans: ""
			});
			else if (item.select) {
				const select = trimSpaces(encodeCsvNewlines(item.select));
				if (select) rows.push({
					id: "select",
					name: "",
					text: select,
					trans: ""
				});
			}
		}
		rows.push({
			id: "info",
			name: normalizeStoryPath(infoPath),
			text: "",
			trans: ""
		});
		rows.push({
			id: "译者",
			name: translator,
			text: "",
			trans: ""
		});
		return import_papaparse_min.default.unparse(rows, {
			columns: [
				"id",
				"name",
				"text",
				"trans"
			],
			newline: "\n"
		}) + "\n";
	}
	function parseKeyValueCsv(csvText, keyField = "text", valueField = "trans", options = {}) {
		const clean = stripBom(csvText);
		const decode = options.decodeNewlines ?? true;
		const parsed = import_papaparse_min.default.parse(clean, {
			header: true,
			skipEmptyLines: true
		});
		const map = new Map();
		for (const row of parsed.data) {
			const rawKey = row[keyField];
			const rawVal = row[valueField];
			if (!rawKey || !rawVal) continue;
			const key = decode ? normalizeLookupText(decodeCsvNewlines(rawKey, false)) : trimSpaces(rawKey);
			const val = decode ? decodeCsvNewlines(rawVal, true) : trimSpaces(rawVal);
			if (key && val) map.set(key, val);
		}
		return map;
	}
	var APP_NAME = "ShinyColors-zh";
	var APP_VERSION = "0.2.2";
	var REPO_OWNER = "Yiyiko";
	var REPO_NAME = "ShinyColors-zh";
	var DATA_SOURCES = [`https://yiyiko.github.io/${REPO_NAME}/`, `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@gh-pages/`];
	function joinUrl(base, relPath) {
		return `${base.endsWith("/") ? base : `${base}/`}${relPath.replace(/^\/+/, "")}`;
	}
	async function defaultTextFetcher(url, timeoutMs) {
		if (typeof GM_xmlhttpRequest === "function") return new Promise((resolve, reject) => {
			GM_xmlhttpRequest({
				method: "GET",
				url,
				timeout: timeoutMs,
				onload: (res) => {
					if (res.status >= 200 && res.status < 300) resolve(res.responseText);
					else reject(new Error(`HTTP ${res.status} for ${url}`));
				},
				onerror: () => reject(new Error(`Network error for ${url}`)),
				ontimeout: () => reject(new Error(`Timeout (${timeoutMs}ms) for ${url}`))
			});
		});
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const res = await fetch(url, { signal: controller.signal });
			if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
			return await res.text();
		} finally {
			clearTimeout(timer);
		}
	}
	function buildSourceList(customSource) {
		const list = [];
		if (customSource && /^https?:\/\//i.test(customSource.trim())) list.push(customSource.trim());
		for (const src of DATA_SOURCES) if (!list.includes(src)) list.push(src);
		return list;
	}
	async function fetchWithFallback(relPath, options = {}) {
		const sources = options.sources ?? DATA_SOURCES;
		const timeoutMs = options.timeoutMs ?? 8e3;
		const fetcher = options.fetcher ?? defaultTextFetcher;
		const suffix = options.queryHash ? `?v=${encodeURIComponent(options.queryHash)}` : "";
		const errors = [];
		for (const source of sources) {
			const url = joinUrl(source, relPath) + suffix;
			try {
				return {
					source,
					url,
					text: await fetcher(url, timeoutMs)
				};
			} catch (err) {
				errors.push(`${source}: ${err instanceof Error ? err.message : String(err)}`);
			}
		}
		throw new Error(`All data sources failed for "${relPath}": ${errors.join("; ")}`);
	}
	var MANIFEST_CACHE_KEY = "manifest.json";
	async function loadManifest(options) {
		try {
			const res = await fetchWithFallback("manifest.json", {
				sources: options.sources,
				queryHash: String(Math.floor(Date.now() / 6e4)),
				timeoutMs: options.timeoutMs,
				fetcher: options.fetcher
			});
			const manifest = JSON.parse(res.text);
			await options.cache.set(MANIFEST_CACHE_KEY, manifest.version, manifest);
			return {
				manifest,
				source: res.source,
				fromCache: false
			};
		} catch (err) {
			const cached = await options.cache.get(MANIFEST_CACHE_KEY);
			if (cached) return {
				manifest: cached.value,
				source: "IndexedDB (offline fallback)",
				fromCache: true
			};
			throw err;
		}
	}
	async function loadCachedTextFile(relPath, expectedHash, options) {
		const cached = await options.cache.get(relPath);
		if (cached && cached.hash === expectedHash) return {
			text: cached.value,
			fromCache: true,
			source: "cache"
		};
		const res = await fetchWithFallback(relPath, {
			sources: options.sources,
			queryHash: expectedHash,
			timeoutMs: options.timeoutMs,
			fetcher: options.fetcher
		});
		await options.cache.set(relPath, expectedHash, res.text);
		return {
			text: res.text,
			fromCache: false,
			source: res.source
		};
	}
	var NUM_RE = "([+-＋－]?[0-9０-９]{1,10}\\.?[0-9０-９]{0,4}[万億]?)";
	var PERCENT_RE = "([+-＋－]?[0-9０-９]{1,10}\\.?[0-9０-９]{0,4}?[%％])";
	var UNKNOWN_RE = "([\\s\\S]*)";
	var SEP_RE = "[\\s\\S]?";
	function escapeRegexChars(str) {
		return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	function escapeTemplateLiteral(str) {
		return str.replace(/\./g, "\\.").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
	}
	function restoreSpace(str) {
		return str.replace(/\u200b/g, " ");
	}
	function compileTemplateCsv(csvText, extraWordMaps = {}) {
		const clean = stripBom(csvText);
		const rows = import_papaparse_min.default.parse(clean, {
			header: true,
			skipEmptyLines: true
		}).data.filter((r) => Boolean(r?.text && r?.trans)).sort((a, b) => (b.text?.length ?? 0) - (a.text?.length ?? 0));
		const textMap = new Map();
		const wordMap = new Map();
		const reMap = new Map();
		const typeBuckets = new Map();
		const nameMap = extraWordMaps.nameMap ?? new Map();
		if (nameMap.size > 0) {
			const sortedNames = Array.from(nameMap.keys()).filter(Boolean).sort((a, b) => b.length - a.length).map(escapeRegexChars);
			typeBuckets.set("name", sortedNames);
		}
		for (const row of rows) {
			const text = normalizeLookupText(decodeCsvNewlines(row.text, false));
			const trans = restoreSpace(decodeCsvNewlines(row.trans, true));
			const rawType = row.type;
			const type = rawType === void 0 ? void 0 : trimSpaces(rawType);
			if (!text || !trans) continue;
			if (type === void 0 || type === "text") {
				if (!textMap.has(text)) textMap.set(text, trans);
			} else if (type === "" || type === "exp") {
				const escaped = escapeTemplateLiteral(text);
				if (!reMap.has(escaped)) reMap.set(escaped, trans);
			} else {
				if (!typeBuckets.has(type)) typeBuckets.set(type, []);
				typeBuckets.get(type).push(escapeRegexChars(text));
				if (!wordMap.has(text)) wordMap.set(text, trans);
			}
		}
		const placeholderRules = [];
		for (const [type, list] of typeBuckets) {
			if (list.length === 0) continue;
			placeholderRules.push({
				re: new RegExp(`\\$${escapeRegexChars(type)}`, "g"),
				exp: `(${list.join("|")})`
			});
		}
		const expMap = new Map();
		for (const [pattern, trans] of reMap) {
			let expr = pattern.replace(/\$num/g, NUM_RE).replace(/\$percent/g, PERCENT_RE).replace(/\$unknown/g, UNKNOWN_RE).replace(/\$uk/g, UNKNOWN_RE).replace(/\$sep/g, SEP_RE);
			for (const rule of placeholderRules) {
				expr = expr.replace(rule.re, rule.exp);
				rule.re.lastIndex = 0;
			}
			try {
				expMap.set(new RegExp(expr, "gi"), trans);
			} catch {}
		}
		return {
			textMap: new Map([
				...textMap,
				...wordMap,
				...nameMap
			]),
			wordMaps: nameMap.size > 0 ? [wordMap, nameMap] : [wordMap],
			expMap
		};
	}
	var TemplateTextMatcher = class {
		dict;
		cache = new Map();
		constructor(dict) {
			this.dict = dict;
		}
		translate(input) {
			if (typeof input !== "string" || !input.trim()) return input;
			const norm = normalizeLookupText(input);
			if (!norm) return input;
			const exact = this.dict.textMap.get(norm);
			if (exact !== void 0) return exact;
			const cached = this.cache.get(norm);
			if (cached !== void 0) return cached;
			let result = norm;
			for (const [re, trans] of this.dict.expMap) {
				result = result.replace(re, (...args) => {
					let replacedText = trans;
					const captureCount = args.length - 2;
					for (let i = 1; i < captureCount; i++) {
						const cap = String(args[i] ?? "");
						let mapped;
						for (const wm of this.dict.wordMaps) if (wm.has(cap)) {
							mapped = wm.get(cap);
							break;
						}
						const finalCap = mapped ?? cap.replace(/億$/, "亿");
						replacedText = replacedText.replace(`$${i}`, finalCap);
					}
					return replacedText;
				});
				re.lastIndex = 0;
			}
			if (result !== norm) {
				if (this.cache.size > 4e3) this.cache.clear();
				this.cache.set(norm, result);
				return result;
			}
			return input;
		}
		translateField(obj, key) {
			if (!obj || typeof obj[key] !== "string") return false;
			const before = obj[key];
			const after = this.translate(before);
			if (after !== before) {
				obj[key] = after;
				return true;
			}
			return false;
		}
		translateLinesField(obj, key) {
			if (!obj || typeof obj[key] !== "string") return false;
			const before = obj[key];
			const after = before.split("\n").map((line) => this.translate(line)).join("\n");
			if (after !== before) {
				obj[key] = after;
				return true;
			}
			return false;
		}
	};
	var CUSTOM_SOURCE_STORAGE_KEY = "sczh:customSource";
	function readCustomSource() {
		try {
			return localStorage.getItem(CUSTOM_SOURCE_STORAGE_KEY);
		} catch {
			return null;
		}
	}
	function writeCustomSource(url) {
		try {
			if (!url || !url.trim()) localStorage.removeItem(CUSTOM_SOURCE_STORAGE_KEY);
			else localStorage.setItem(CUSTOM_SOURCE_STORAGE_KEY, url.trim());
		} catch {}
	}
	var DataRepository = class {
		cache;
		sources;
		fetcher;
		timeoutMs;
		manifestPromise = null;
		activeSource = null;
		storyIndexPromise = null;
		pictureMapPromise = null;
		imageMapPromise = null;
		kvPromises = new Map();
		profileMapPromise = null;
		templatePromises = new Map();
		storyPromises = new Map();
		constructor(options = {}) {
			this.cache = options.cache ?? new IndexedDbCache();
			this.sources = buildSourceList(options.customSource ?? readCustomSource());
			this.fetcher = options.fetcher;
			this.timeoutMs = options.timeoutMs ?? 8e3;
		}
		getSources() {
			return this.sources;
		}
		getActiveBaseUrl() {
			return this.activeSource ?? this.sources[0];
		}
		async getManifest() {
			if (!this.manifestPromise) this.manifestPromise = loadManifest({
				cache: this.cache,
				sources: this.sources,
				fetcher: this.fetcher,
				timeoutMs: this.timeoutMs
			}).then((loaded) => {
				if (!loaded.fromCache && /^https?:\/\//i.test(loaded.source)) this.activeSource = loaded.source;
				return loaded;
			});
			return this.manifestPromise;
		}
		async loadTextByManifest(relPath) {
			const { manifest } = await this.getManifest();
			const hash = manifest.files[relPath];
			if (!hash) return null;
			return (await loadCachedTextFile(relPath, hash, {
				cache: this.cache,
				sources: this.getOrderedSources(),
				fetcher: this.fetcher,
				timeoutMs: this.timeoutMs
			})).text;
		}
		getOrderedSources() {
			if (!this.activeSource) return this.sources;
			return [this.activeSource, ...this.sources.filter((s) => s !== this.activeSource)];
		}
		async getStoryIndex() {
			if (!this.storyIndexPromise) this.storyIndexPromise = (async () => {
				const text = await this.loadTextByManifest("story-index.json");
				const map = new Map();
				if (!text) return map;
				const list = JSON.parse(text);
				for (const item of list) if (item[0] && item[1]) map.set(normalizeStoryPath(item[0]), {
					hash: item[1],
					isAI: Boolean(item[2])
				});
				return map;
			})();
			return this.storyIndexPromise;
		}
		async getStory(logicalPath) {
			const norm = normalizeStoryPath(logicalPath);
			if (!this.storyPromises.has(norm)) this.storyPromises.set(norm, (async () => {
				const entry = (await this.getStoryIndex()).get(norm);
				if (!entry) return null;
				const parsed = parseStoryCsv((await loadCachedTextFile(`data/story/${entry.hash}.csv`, entry.hash, {
					cache: this.cache,
					sources: this.getOrderedSources(),
					fetcher: this.fetcher,
					timeoutMs: this.timeoutMs
				})).text);
				if (entry.isAI && !parsed.isAI) parsed.isAI = true;
				return parsed;
			})().catch(() => null));
			return this.storyPromises.get(norm);
		}
		async getKeyValueMap(relPath, keyField = "text", valueField = "trans") {
			const cacheKey = `${relPath}|${keyField}|${valueField}`;
			if (!this.kvPromises.has(cacheKey)) this.kvPromises.set(cacheKey, (async () => {
				const text = await this.loadTextByManifest(relPath);
				if (!text) return new Map();
				return parseKeyValueCsv(text, keyField, valueField);
			})().catch(() => new Map()));
			return this.kvPromises.get(cacheKey);
		}
		getPhraseMap() {
			return this.getKeyValueMap("data/phrase.csv", "id", "trans");
		}
		getCommonTextMap() {
			return this.getKeyValueMap("data/common.csv", "text", "trans");
		}
		getTypeTextMap() {
			return this.getKeyValueMap("data/type-text.csv", "text", "trans");
		}
		getCommStoryMap() {
			return this.getKeyValueMap("data/comm-story.csv", "text", "trans");
		}
		getNameMap() {
			return this.getKeyValueMap("data/name.csv", "name", "trans");
		}
		getIdolNameMap() {
			return this.getKeyValueMap("data/etc/idol-name.csv", "name", "trans");
		}
		async getProfileMap() {
			if (!this.profileMapPromise) this.profileMapPromise = (async () => {
				const text = await this.loadTextByManifest("data/profile.csv");
				const map = new Map();
				if (!text) return map;
				const parsed = import_papaparse_min.default.parse(stripBom(text), {
					header: true,
					skipEmptyLines: true
				});
				for (const row of parsed.data) {
					const id = trimSpaces(row.id);
					if (id) map.set(id, row);
				}
				return map;
			})().catch(() => new Map());
			return this.profileMapPromise;
		}
		async getTemplateMatcher(relPath) {
			if (!this.templatePromises.has(relPath)) this.templatePromises.set(relPath, (async () => {
				const [csv, idolNameMap] = await Promise.all([this.loadTextByManifest(relPath), this.getIdolNameMap()]);
				if (!csv) return new TemplateTextMatcher({
					textMap: new Map(),
					wordMaps: [],
					expMap: new Map()
				});
				return new TemplateTextMatcher(compileTemplateCsv(csv, { nameMap: idolNameMap }));
			})().catch(() => new TemplateTextMatcher({
				textMap: new Map(),
				wordMaps: [],
				expMap: new Map()
			})));
			return this.templatePromises.get(relPath);
		}
		async getImageMap() {
			if (!this.imageMapPromise) this.imageMapPromise = (async () => {
				const text = await this.loadTextByManifest("data/etc/image.csv");
				const map = new Map();
				if (!text) return map;
				const parsed = import_papaparse_min.default.parse(stripBom(text), {
					header: true,
					skipEmptyLines: true
				});
				for (const row of parsed.data) {
					const name = trimSpaces(row.name);
					const url = trimSpaces(row.url);
					const version = trimSpaces(row.version) || "1";
					if (name && url) map.set(name, {
						url,
						version
					});
				}
				return map;
			})().catch(() => new Map());
			return this.imageMapPromise;
		}
		async getPictureMap() {
			if (!this.pictureMapPromise) this.pictureMapPromise = (async () => {
				const text = await this.loadTextByManifest("picture.json");
				const map = new Map();
				if (!text) return map;
				const list = JSON.parse(text);
				for (const [key, hash] of list) if (key && hash) map.set(key, hash);
				return map;
			})().catch(() => new Map());
			return this.pictureMapPromise;
		}
		buildAssetUrl(relPath, manifest) {
			const hash = manifest.files[relPath];
			if (!hash) return null;
			return `${this.getActiveBaseUrl().replace(/\/+$/, "")}/${relPath.replace(/^\/+/, "")}?v=${encodeURIComponent(hash)}`;
		}
		async clearCache() {
			await this.cache.clear();
			this.manifestPromise = null;
			this.storyIndexPromise = null;
			this.pictureMapPromise = null;
			this.imageMapPromise = null;
			this.kvPromises.clear();
			this.profileMapPromise = null;
			this.templatePromises.clear();
			this.storyPromises.clear();
		}
	};
	var PREVIEW_STORAGE_KEY = "sczh:preview-csv";
	var StoryEditorStore = class {
		lastStory = null;
		untranslated = new Map();
		untranslatedVoices = new Set();
		previewMap = new Map();
		loadedPreview = false;
		recordUntranslatedVoice(text) {
			const clean = text.trim();
			if (!clean || this.untranslatedVoices.size >= 500) return;
			this.untranslatedVoices.add(clean);
		}
		getUntranslatedVoiceCount() {
			return this.untranslatedVoices.size;
		}
		exportUntranslatedVoicesCsv() {
			if (this.untranslatedVoices.size === 0) return null;
			const rows = Array.from(this.untranslatedVoices).map((t) => ({
				text: encodeCsvNewlines(t),
				trans: ""
			}));
			return import_papaparse_min.default.unparse(rows, {
				columns: ["text", "trans"],
				newline: "\n"
			}) + "\n";
		}
		recordLoadedStory(logicalPath, rawItems, hasTranslation) {
			const norm = normalizeStoryPath(logicalPath);
			const cloned = rawItems.map((item) => ({ ...item }));
			this.lastStory = {
				path: norm,
				items: cloned,
				capturedAt: new Date().toISOString()
			};
			if (!hasTranslation) this.untranslated.set(norm, cloned);
		}
		getLastStory() {
			return this.lastStory;
		}
		getUntranslatedPaths() {
			return Array.from(this.untranslated.keys());
		}
		exportLastStoryCsv(translator = "") {
			if (!this.lastStory) return null;
			return {
				filename: `${this.lastStory.path.replace(/\.json$/i, "").replace(/\//g, "_")}.csv`,
				content: exportStoryToCsv(this.lastStory.items, this.lastStory.path, translator)
			};
		}
		exportUntranslatedBundle() {
			const out = {};
			for (const [storyPath, items] of this.untranslated) out[storyPath] = exportStoryToCsv(items, storyPath, "");
			return out;
		}
		setPreviewCsv(csvText) {
			const parsed = parseStoryCsv(csvText);
			if (!parsed.infoPath) return null;
			this.ensurePreviewLoaded();
			this.previewMap.set(parsed.infoPath, parsed);
			this.persistPreview(parsed.infoPath, csvText);
			return parsed;
		}
		getPreview(logicalPath) {
			this.ensurePreviewLoaded();
			return this.previewMap.get(normalizeStoryPath(logicalPath)) ?? null;
		}
		clearPreviews() {
			this.previewMap.clear();
			try {
				sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
			} catch {}
		}
		ensurePreviewLoaded() {
			if (this.loadedPreview) return;
			this.loadedPreview = true;
			try {
				const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
				if (!raw) return;
				const obj = JSON.parse(raw);
				for (const [k, csv] of Object.entries(obj)) this.previewMap.set(normalizeStoryPath(k), parseStoryCsv(csv));
			} catch {}
		}
		persistPreview(infoPath, csvText) {
			try {
				const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
				const obj = raw ? JSON.parse(raw) : {};
				obj[infoPath] = csvText;
				sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(obj));
			} catch {}
		}
	};
	function triggerTextDownload(filename, content, mime = "text/csv;charset=utf-8") {
		if (typeof document === "undefined") return;
		const payload = mime.includes("text/csv") && !content.startsWith("﻿") ? `\uFEFF${content}` : content;
		const blob = new Blob([payload], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.style.display = "none";
		(document.body ?? document.documentElement).appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1e3);
	}
	function translateSingleSpeakerToken(token, nameMap) {
		const trimmed = trimSpaces(token);
		if (!trimmed) return token;
		if (nameMap.has(trimmed)) return nameMap.get(trimmed);
		const numMatch = trimmed.match(/^(.*?)([0-9０-９])$/);
		if (numMatch) {
			const [, base, suffix] = numMatch;
			if (nameMap.has(base)) return nameMap.get(base) + suffix;
		}
		return token;
	}
	function translateSpeaker(speaker, nameMap) {
		if (!speaker || !nameMap || nameMap.size === 0) return speaker ?? "";
		const trimmed = trimSpaces(speaker);
		if (!trimmed) return speaker;
		if (nameMap.has(trimmed)) return nameMap.get(trimmed);
		let current = trimmed;
		for (const sep of ["＆", "&"]) if (current.includes(sep)) current = current.split(sep).map((part) => translateSingleSpeakerToken(part, nameMap)).join(sep);
		if (current === trimmed) current = translateSingleSpeakerToken(trimmed, nameMap);
		return current;
	}
	function applyStoryTranslation(items, options) {
		const { story, commMap, nameMap, tagMarker = "" } = options;
		const nextId = createUniqueStoryIdGenerator();
		const textCounts = new Map();
		const stats = {
			totalLines: 0,
			matchedLines: 0,
			matchedById: 0,
			matchedByText: 0,
			matchedByComm: 0,
			matchedSelects: 0,
			totalSelects: 0,
			matchedSpeakers: 0,
			coveragePct: 0
		};
		for (const item of items) {
			if (!item || typeof item !== "object") continue;
			if (typeof item.text === "string" && item.text.trim()) {
				stats.totalLines += 1;
				const uid = nextId(item.id !== void 0 ? String(item.id) : void 0);
				const norm = normalizeLookupText(item.text);
				const occ = textCounts.get(norm) ?? 0;
				textCounts.set(norm, occ + 1);
				let translated;
				if (story && uid && story.byId.has(uid)) {
					translated = story.byId.get(uid);
					stats.matchedById += 1;
				} else if (story && story.byText.has(`${norm}#${occ}`)) {
					translated = story.byText.get(`${norm}#${occ}`);
					stats.matchedByText += 1;
				} else if (story && story.byText.has(norm)) {
					translated = story.byText.get(norm);
					stats.matchedByText += 1;
				} else if (commMap && commMap.has(norm)) {
					translated = commMap.get(norm);
					stats.matchedByComm += 1;
				}
				if (translated) {
					item.text = tagMarker ? `${tagMarker}${translated}` : translated;
					stats.matchedLines += 1;
				}
			}
			if (typeof item.select === "string" && item.select.trim()) {
				stats.totalSelects += 1;
				const normSel = normalizeLookupText(item.select);
				const transSel = story?.bySelect.get(normSel) ?? commMap?.get(normSel);
				if (transSel) {
					item.select = transSel;
					stats.matchedSelects += 1;
				}
			}
			if (typeof item.speaker === "string" && item.speaker.trim() && nameMap) {
				const nextSpeaker = translateSpeaker(item.speaker, nameMap);
				if (nextSpeaker !== item.speaker) {
					item.speaker = nextSpeaker;
					stats.matchedSpeakers += 1;
				}
			}
		}
		const totalTrackable = stats.totalLines + stats.totalSelects;
		const totalMatched = stats.matchedLines + stats.matchedSelects;
		stats.coveragePct = totalTrackable > 0 ? Math.round(totalMatched / totalTrackable * 1e3) / 10 : 100;
		return stats;
	}
	function compileRoutePattern(pattern) {
		if (!pattern.includes("{") && !pattern.includes("(") && !pattern.includes("\\?")) return pattern;
		const exp = pattern.replace(/\{num\}/g, "\\d+").replace(/\{uuid\}/g, "[a-f\\d]{8}-([a-f\\d]{4}-){3}[a-f\\d]{12}");
		return new RegExp(`^${exp}$`);
	}
	var ApiRouter = class {
		routes = {
			GET: [],
			POST: [],
			PUT: [],
			PATCH: [],
			DELETE: []
		};
		register(method, patterns, handler) {
			const list = typeof patterns === "string" ? [patterns] : patterns;
			for (const pat of list) this.routes[method].push({
				matcher: compileRoutePattern(pat),
				handlers: [handler]
			});
		}
		async dispatch(method, reqPath, body) {
			if (!body || typeof body !== "object") return 0;
			const upper = method.toUpperCase();
			const entries = this.routes[upper];
			if (!entries || entries.length === 0) return 0;
			let executed = 0;
			for (const entry of entries) {
				if (!(typeof entry.matcher === "string" ? entry.matcher === reqPath : entry.matcher.test(reqPath))) continue;
				for (const fn of entry.handlers) {
					await fn(body);
					executed += 1;
				}
			}
			return executed;
		}
	};
	function translateRewardContent(content, missionMatcher, itemMatcher) {
		if (!content || typeof content !== "object") return;
		const obj = content;
		if (!missionMatcher.translateField(obj, "name")) itemMatcher.translateField(obj, "name");
		if (!missionMatcher.translateField(obj, "comment")) itemMatcher.translateLinesField(obj, "comment");
	}
	function translateMissionList(list, missionMatcher, itemMatcher) {
		if (!Array.isArray(list)) return;
		for (const entry of list) {
			const rec = entry;
			const mission = rec?.mission ?? rec;
			if (!mission || typeof mission !== "object") continue;
			missionMatcher.translateField(mission, "title");
			missionMatcher.translateField(mission, "comment");
			missionMatcher.translateField(mission, "afterAchievedComment");
			missionMatcher.translateField(mission, "beforeAchievedComment");
			translateRewardContent((mission.missionReward ?? mission.lectureMissionReward)?.content, missionMatcher, itemMatcher);
		}
	}
	function translateSkillObject(obj, skillMatcher) {
		if (!obj || typeof obj !== "object") return;
		const rec = obj;
		skillMatcher.translateField(rec, "name");
		skillMatcher.translateField(rec, "comment");
		skillMatcher.translateField(rec, "releaseConditions");
		if (Array.isArray(rec.skillEffects)) {
			for (const eff of rec.skillEffects) if (eff && typeof eff === "object") {
				skillMatcher.translateField(eff, "effectName");
				skillMatcher.translateField(eff, "effectDescription");
			}
		}
		if (rec.linkSkill) translateSkillObject(rec.linkSkill, skillMatcher);
	}
	function translateSkillPanels(panels, skillMatcher) {
		if (!Array.isArray(panels)) return;
		for (const panel of panels) {
			if (!panel || typeof panel !== "object") continue;
			const rec = panel;
			skillMatcher.translateField(rec, "releaseConditions");
			translateSkillObject(rec.passiveSkills, skillMatcher);
			translateSkillObject(rec.skill, skillMatcher);
			translateSkillObject(rec.concertActiveSkill, skillMatcher);
			if (Array.isArray(rec.activeSkills)) rec.activeSkills.forEach((s) => translateSkillObject(s, skillMatcher));
		}
	}
	function registerDefaultApiRoutes(router, repo, editor, translator) {
		const handleMissions = async (data) => {
			const [missionMatcher, itemMatcher] = await Promise.all([repo.getTemplateMatcher("data/etc/mission.csv"), repo.getTemplateMatcher("data/etc/item.csv")]);
			translateMissionList(data.dailyUserMissions, missionMatcher, itemMatcher);
			translateMissionList(data.weeklyUserMissions, missionMatcher, itemMatcher);
			translateMissionList(data.normalUserMissions, missionMatcher, itemMatcher);
			translateMissionList(data.specialUserMissions, missionMatcher, itemMatcher);
			translateMissionList(data.reportUserMissions, missionMatcher, itemMatcher);
			translateMissionList(data.lectureMissions, missionMatcher, itemMatcher);
			if (Array.isArray(data.eventUserMissions)) for (const grp of data.eventUserMissions) translateMissionList(grp?.userMissions, missionMatcher, itemMatcher);
			const beginner = data.beginnerMission;
			if (beginner) {
				if (beginner.clearedLectureMission) translateMissionList([beginner.clearedLectureMission], missionMatcher, itemMatcher);
				if (beginner.progressLectureMission) translateMissionList([beginner.progressLectureMission], missionMatcher, itemMatcher);
			}
			const recMission = data.userRecommendedMission?.mission;
			if (recMission) translateMissionList([recMission], missionMatcher, itemMatcher);
			const desk = data.producerDesk;
			if (Array.isArray(desk?.messages)) {
				for (let i = 0; i < desk.messages.length; i++) if (typeof desk.messages[i] === "string") desk.messages[i] = missionMatcher.translate(desk.messages[i]);
			}
			if (Array.isArray(data.progresses)) {
				for (const p of data.progresses) if (p && typeof p === "object") {
					missionMatcher.translateField(p, "title");
					missionMatcher.translateField(p, "comment");
				}
			}
		};
		router.register("GET", [
			"userMissions",
			"userBeginnerMissions/top",
			"idolRoads/top"
		], handleMissions);
		router.register("POST", [
			"myPage",
			"userLectureMissions/{num}/actions/receive",
			"producerDesk/top"
		], handleMissions);
		const ITEM_SUBKEYS = [
			"produceItem",
			"recoveryItem",
			"exchangeItem",
			"lotteryTicket",
			"evolutionItem",
			"gashaTicket",
			"scoutTicket",
			"enhancementItem"
		];
		const handleItems = async (data) => {
			const itemMatcher = await repo.getTemplateMatcher("data/etc/item.csv");
			const list = Array.isArray(data) ? data : Array.isArray(data.userProduceItems) ? data.userProduceItems : null;
			if (list) for (const row of list) {
				if (!row || typeof row !== "object") continue;
				const rec = row;
				for (const sub of ITEM_SUBKEYS) if (rec[sub] && typeof rec[sub] === "object") {
					itemMatcher.translateField(rec[sub], "name");
					itemMatcher.translateLinesField(rec[sub], "comment");
					break;
				}
				if (rec.content && typeof rec.content === "object") itemMatcher.translateField(rec.content, "name");
				itemMatcher.translateField(rec, "note");
			}
			const translateShops = (shops) => {
				if (!Array.isArray(shops)) return;
				for (const s of shops) {
					const shop = s?.userShop ?? s;
					if (!Array.isArray(shop?.shopMerchandises)) continue;
					for (const m of shop.shopMerchandises) {
						if (!m || typeof m !== "object") continue;
						const merch = m;
						itemMatcher.translateField(merch, "title");
						itemMatcher.translateField(merch, "shopTitle");
						itemMatcher.translateLinesField(merch, "comment");
					}
				}
			};
			translateShops(data.userShops);
			translateShops(data.userEventShops);
		};
		router.register("GET", [
			"userShops",
			"userIdolPieceShops",
			"userRecoveryItems",
			"userProduceItems",
			"userExchangeItems",
			"userLotteryTickets",
			"userEvolutionItems",
			"userGashaTickets",
			"userScoutTickets",
			"userEnhancementItems",
			"userPresents\\?limit={num}",
			"userPresentHistories\\?limit={num}"
		], handleItems);
		router.register("POST", ["produces/{num}/actions/ready"], handleItems);
		const handleSkills = async (data) => {
			const skillMatcher = await repo.getTemplateMatcher("data/skill.csv");
			const idol = data.idol;
			if (idol) {
				translateSkillPanels(idol.skillPanels, skillMatcher);
				if (Array.isArray(idol.memoryAppeals)) idol.memoryAppeals.forEach((m) => translateSkillObject(m, skillMatcher));
				if (Array.isArray(idol.abilities)) idol.abilities.forEach((a) => translateSkillObject(a, skillMatcher));
			}
			const spt = data.supportIdol;
			if (spt) translateSkillPanels(spt.skillPanels, skillMatcher);
			translateSkillPanels(data.skillPanels, skillMatcher);
			if (Array.isArray(data.activeSkills)) data.activeSkills.forEach((s) => translateSkillObject(s, skillMatcher));
			const fesIdol = data.userFesIdol;
			if (fesIdol) {
				if (Array.isArray(fesIdol.activeSkills)) fesIdol.activeSkills.forEach((s) => translateSkillObject(s, skillMatcher));
				translateSkillObject(fesIdol.memoryAppeal, skillMatcher);
				if (Array.isArray(fesIdol.passiveSkills)) fesIdol.passiveSkills.forEach((s) => translateSkillObject(s, skillMatcher));
			}
		};
		router.register("GET", [
			"userIdols/{num}",
			"userIdols/statusMax",
			"userSupportIdols/{num}",
			"userSupportIdols/statusMax",
			"userProduce(Teaching)?Idols/{num}",
			"userProduce(Teaching)?SupportIdols/{num}",
			"userFesIdols/{num}",
			"userProduces/skillPanels"
		], handleSkills);
		const handleTitles = async (data) => {
			const titleMatcher = await repo.getTemplateMatcher("data/title.csv");
			const transEvents = (events) => {
				if (!Array.isArray(events)) return;
				for (const ev of events) {
					if (!ev || typeof ev !== "object") continue;
					const rec = ev;
					titleMatcher.translateField(rec, "name");
					if (Array.isArray(rec.communications)) {
						for (const commu of rec.communications) if (commu && typeof commu === "object") {
							titleMatcher.translateField(commu, "name");
							titleMatcher.translateField(commu, "title");
						}
					}
				}
			};
			transEvents(data.gameEvents);
			transEvents(data.specialEvents);
			for (const key of [
				"albumCommunicationTitles",
				"communications",
				"voices"
			]) {
				const list = data[key];
				if (!Array.isArray(list)) continue;
				for (const item of list) if (item && typeof item === "object") {
					titleMatcher.translateField(item, "title");
					titleMatcher.translateField(item, "releasedConditionComment");
				}
			}
		};
		router.register("GET", ["characterAlbums", "album/top"], handleTitles);
		router.register("POST", ["characterAlbums/characters/{num}", "produceMarathons/{num}/top"], handleTitles);
		const translateSupportSkillList = (list, supportMatcher, filterMatcher) => {
			if (!Array.isArray(list)) return;
			for (const item of list) {
				if (!item || typeof item !== "object") continue;
				const rec = item;
				supportMatcher.translateField(rec, "description");
				if (typeof rec.name === "string") {
					const name = rec.name;
					if (name.includes("マスタリー") && !name.endsWith("マスタリー")) {
						const idx = name.lastIndexOf("マスタリー") + 5;
						const prefix = name.slice(0, idx);
						const suffix = name.slice(idx);
						rec.name = filterMatcher.translate(prefix) + suffix;
					} else filterMatcher.translateField(rec, "name");
				}
			}
		};
		const handleSupportSkills = async (data) => {
			const [supportMatcher, filterMatcher] = await Promise.all([repo.getTemplateMatcher("data/etc/support-skill.csv"), repo.getTemplateMatcher("data/etc/idol-filter.csv")]);
			const target = data.userSupportIdol ?? data;
			translateSupportSkillList(target.acquiredSupportSkills, supportMatcher, filterMatcher);
			translateSupportSkillList(target.supportSkills, supportMatcher, filterMatcher);
			const inner = target.supportIdol;
			translateSupportSkillList(inner?.supportSkills, supportMatcher, filterMatcher);
			if (Array.isArray(data.userSupportIdols)) for (const s of data.userSupportIdols) {
				const si = s?.supportIdol;
				translateSupportSkillList(si?.supportSkills, supportMatcher, filterMatcher);
			}
			if (Array.isArray(data.userDecks)) for (const deck of data.userDecks) {
				const members = deck?.userSupportIdols;
				if (!Array.isArray(members)) continue;
				for (const s of members) {
					const si = s?.supportIdol;
					translateSupportSkillList(si?.supportSkills, supportMatcher, filterMatcher);
				}
			}
		};
		router.register("GET", [
			"userSupportIdols/{num}",
			"userSupportIdols/statusMax",
			"produceTeachingSupportIdols/{num}",
			"userProduce(Teaching)?SupportIdols/{num}",
			"userReserveSupportIdols/userSupportIdol/{num}",
			"produces/{num}/decks"
		], handleSupportSkills);
		router.register("POST", [
			"produces/{num}/actions/ready",
			"userSupportIdols/{num}/produceExSkills/{num}/actions/set",
			"produces/actions/(resume|next)"
		], handleSupportSkills);
		router.register("PATCH", ["userSupportIdols/{num}", "produces/{num}/produceItem/consume"], handleSupportSkills);
		const handleExSkills = async (data) => {
			const exMatcher = await repo.getTemplateMatcher("data/etc/ex-skill.csv");
			const translateExList = (list) => {
				if (!Array.isArray(list)) return;
				for (const entry of list) {
					if (!entry || typeof entry !== "object") continue;
					const rec = entry;
					const target = rec.produceExSkill ?? rec;
					exMatcher.translateField(target, "name");
					exMatcher.translateField(target, "description");
					const upg = rec.produceExSkillUpgrade?.produceExSkill;
					if (upg) {
						exMatcher.translateField(upg, "name");
						exMatcher.translateField(upg, "description");
					}
				}
			};
			translateExList(data.userIdolProduceExSkills);
			translateExList(data.userProduceIdolProduceExSkills);
			translateExList(data.userSupportIdolProduceExSkills);
			translateExList(data.userProduceSupportIdolProduceExSkills);
			translateExList(data.produceExSkillRewards);
			translateExList(data.userProduceExSkills);
			if (Array.isArray(data)) translateExList(data);
			const fesIdol = data.userFesIdol;
			if (fesIdol) {
				translateExList(fesIdol.userFesIdolProduceExSkills);
				if (Array.isArray(fesIdol.userFesSupportIdols)) for (const spt of fesIdol.userFesSupportIdols) translateExList(spt?.userFesSupportIdolProduceExSkills);
			}
			if (data.produceExSkill && typeof data.produceExSkill === "object") {
				exMatcher.translateField(data.produceExSkill, "name");
				exMatcher.translateField(data.produceExSkill, "description");
			}
		};
		router.register("GET", [
			"userIdols/produceExSkillTop",
			"userSupportIdols/produceExSkillTop",
			"userIdols/{num}/produceExSkillTop",
			"userSupportIdols/{num}/produceExSkillTop",
			"userIdols/{num}",
			"userSupportIdols/{num}",
			"userProduce(Teaching)?Idols/{num}",
			"userProduce(Teaching)?SupportIdols/{num}",
			"userFesIdols/{num}",
			"userProducerSkills/summaries"
		], handleExSkills);
		router.register("POST", [
			"userIdols/{num}/produceExSkills/{num}/actions/set",
			"userSupportIdols/{num}/produceExSkills/{num}/actions/set",
			"produces/actions/result",
			"userProduceExSkills/actions/upgrade"
		], handleExSkills);
		const handleFilterOptions = async (data) => {
			const filterMatcher = await repo.getTemplateMatcher("data/etc/idol-filter.csv");
			for (const key of ["businesses", "units"]) if (Array.isArray(data[key])) data[key].forEach((item) => filterMatcher.translateField(item, "name"));
			if (Array.isArray(data.produces)) data.produces.forEach((item) => filterMatcher.translateField(item, "title"));
			if (Array.isArray(data.characters)) for (const ch of data.characters) {
				filterMatcher.translateField(ch, "name");
				filterMatcher.translateField(ch, "firstName");
				if (ch.unit && typeof ch.unit === "object") filterMatcher.translateField(ch.unit, "name");
			}
			for (const key of [
				"activeSkills",
				"ideas",
				"idolArrivalTypes",
				"knowHowBooks",
				"supportSkillAttributes",
				"supportSkillEffects"
			]) if (Array.isArray(data[key])) data[key].forEach((item) => filterMatcher.translateField(item, "label"));
		};
		router.register("GET", ["searchPopupContents"], handleFilterOptions);
		const handleProduceTitles = async (data) => {
			const titleMatcher = await repo.getTemplateMatcher("data/title.csv");
			if (Array.isArray(data.produceEvents)) {
				for (const ev of data.produceEvents) if (ev && typeof ev === "object") titleMatcher.translateField(ev, "title");
			}
			if (Array.isArray(data.produceHintSettings)) {
				for (const h of data.produceHintSettings) if (h && typeof h === "object") titleMatcher.translateField(h, "title");
			}
			const up = data.userProduce?.produce;
			if (up) titleMatcher.translateField(up, "title");
		};
		router.register("GET", ["userProduceAreas"], handleProduceTitles);
		router.register("POST", [
			"myPage",
			"produces/actions/(resume|next|finish|act)",
			"produceTeachings/resume"
		], handleProduceTitles);
		const handleCharacterProfile = async (data) => {
			const [profileMap, idolNameMap] = await Promise.all([repo.getProfileMap(), repo.getIdolNameMap()]);
			const applyProfile = (charObj) => {
				if (!charObj || typeof charObj !== "object") return;
				const chara = charObj;
				if (typeof chara.name === "string" && idolNameMap.has(chara.name)) chara.name = idolNameMap.get(chara.name);
				if (typeof chara.firstName === "string" && idolNameMap.has(chara.firstName)) chara.firstName = idolNameMap.get(chara.firstName);
				const row = profileMap.get(String(chara.id ?? ""));
				if (!row) return;
				for (const [k, v] of Object.entries(row)) {
					if (k === "id" || !v || !chara[k]) continue;
					if (k === "unit" && typeof chara.unit === "object" && chara.unit !== null) chara.unit.name = v;
					else if (typeof chara[k] === "string") chara[k] = v;
				}
			};
			if (data.id && (data.starSign || data.hobby || data.characterVoice)) applyProfile(data);
			applyProfile(data.idol?.character);
			applyProfile(data.supportIdol?.character);
			applyProfile(data.userFesIdol?.idol?.character);
		};
		router.register("GET", [
			"userIdols/{num}",
			"userSupportIdols/{num}",
			"userFesIdols/{num}"
		], handleCharacterProfile);
		router.register("POST", ["characterAlbums/characters/{num}"], handleCharacterProfile);
		let noWrapVoiceCache = null;
		let mergedSpeakerMap = null;
		const buildSpeakerMap = (nameMap, idolNameMap) => {
			const out = new Map(nameMap);
			for (const [k, v] of idolNameMap) {
				if (!out.has(k)) out.set(k, v);
				const compactK = k.replace(/\s+/g, "");
				const compactV = v.replace(/\s+/g, "");
				if (compactK && !out.has(compactK)) out.set(compactK, compactV);
				const partsK = k.split(/\s+/);
				const partsV = v.split(/\s+/);
				if (partsK.length === 2 && partsV.length === 2) {
					if (partsK[1] && !out.has(partsK[1])) out.set(partsK[1], partsV[1]);
				}
			}
			for (const [k, v] of [
				["鈴木 羽那", "铃木 羽那"],
				["鈴木羽那", "铃木羽那"],
				["羽那", "羽那"],
				["郁田 はるき", "郁田 春希"],
				["郁田はるき", "郁田春希"],
				["はるき", "春希"]
			]) if (!out.has(k)) out.set(k, v);
			return out;
		};
		const translateVoiceField = async (list, field = "comment", translateSpeakerName = false) => {
			if (list.length === 0) return;
			const [typeTextMap, commStoryMap, nameMap, idolNameMap] = await Promise.all([
				repo.getTypeTextMap(),
				repo.getCommStoryMap(),
				repo.getNameMap(),
				repo.getIdolNameMap()
			]);
			if (!mergedSpeakerMap && (nameMap.size > 0 || idolNameMap.size > 0)) mergedSpeakerMap = buildSpeakerMap(nameMap, idolNameMap);
			if (!noWrapVoiceCache && (typeTextMap.size > 0 || commStoryMap.size > 0)) {
				noWrapVoiceCache = new Map();
				for (const [k, v] of typeTextMap) {
					const compact = k.replace(/[\s\u3000]+/g, "");
					if (compact && !noWrapVoiceCache.has(compact)) noWrapVoiceCache.set(compact, v);
				}
				for (const [k, v] of commStoryMap) {
					const compact = k.replace(/[\s\u3000]+/g, "");
					if (compact && !noWrapVoiceCache.has(compact)) noWrapVoiceCache.set(compact, v);
				}
			}
			const spMap = mergedSpeakerMap ?? nameMap;
			const missedVoices = [];
			for (const entry of list) {
				if (!entry || typeof entry !== "object") continue;
				const rec = entry;
				if (typeof rec[field] === "string" && rec[field].trim()) {
					const raw = rec[field];
					const norm = normalizeLookupText(raw);
					const compact = norm.replace(/[\s\u3000]+/g, "");
					const hit = typeTextMap.get(norm) ?? commStoryMap.get(norm) ?? noWrapVoiceCache?.get(compact);
					if (hit) rec[field] = hit;
					else {
						editor?.recordUntranslatedVoice(raw);
						missedVoices.push({
							rec,
							norm
						});
					}
				}
				if (translateSpeakerName) {
					for (const nameKey of [
						"speakerName",
						"firstName",
						"name"
					]) if (typeof rec[nameKey] === "string" && rec[nameKey].trim()) {
						const origName = rec[nameKey];
						const nextName = translateSpeaker(origName, spMap);
						if (nextName !== origName) rec[nameKey] = nextName;
					}
				}
			}
			if (missedVoices.length > 0 && translator?.isVoiceTranslationEnabled()) try {
				const mtMap = await translator.translateVoices(missedVoices.map((m) => m.norm));
				for (const { rec, norm } of missedVoices) {
					const trans = mtMap.get(norm);
					if (trans) rec[field] = trans;
				}
			} catch {}
		};
		const collectVoiceObjects = (root, out, seen = new Set(), depth = 0) => {
			if (!root || typeof root !== "object" || depth > 8 || seen.has(root)) return;
			seen.add(root);
			if (Array.isArray(root)) {
				for (const item of root) collectVoiceObjects(item, out, seen, depth + 1);
				return;
			}
			const rec = root;
			if (typeof rec.comment === "string" && rec.comment.trim() || typeof rec.firstName === "string" && rec.firstName.trim() || typeof rec.speakerName === "string" && rec.speakerName.trim()) out.push(rec);
			for (const val of Object.values(rec)) if (val && typeof val === "object") collectVoiceObjects(val, out, seen, depth + 1);
		};
		const handleMyPageVoices = async (data) => {
			const list = [];
			if (data.userHomeDeck) collectVoiceObjects(data.userHomeDeck, list);
			if (data.userHomeAnimationDeck) collectVoiceObjects(data.userHomeAnimationDeck, list);
			if (data.userHomeUnitDeck) collectVoiceObjects(data.userHomeUnitDeck, list);
			await translateVoiceField(list, "comment", true);
		};
		const handleFesTopVoices = async (data) => {
			const members = data.userFesDeck?.userFesDeckMembers;
			if (!Array.isArray(members)) return;
			const list = [];
			for (const m of members) if (Array.isArray(m?.fesTopCharacterReactions)) list.push(...m.fesTopCharacterReactions);
			await translateVoiceField(list, "comment", false);
		};
		const handleProduceVoices = async (data) => {
			const list = [];
			const topReact = data.topCharacterReaction;
			if (topReact) {
				for (const k of [
					"moveReactions",
					"skillReleasedReactions",
					"touchExReactions",
					"touchReactions",
					"waitReactions"
				]) if (Array.isArray(topReact[k])) list.push(...topReact[k]);
			}
			for (const k of [
				"produceStaffComments",
				"produceStaffConcertComments",
				"produceStaffFailComments",
				"produceStaffSeasonComments",
				"characterTrustLevelUpComments"
			]) if (Array.isArray(data[k])) list.push(...data[k]);
			if (data.characterComment) list.push(...Array.isArray(data.characterComment) ? data.characterComment : [data.characterComment]);
			const lr = data.lessonResult;
			if (lr) {
				for (const k of [
					"produceActCutinComment",
					"produceRestBoostIdolComment",
					"produceRestBoostSupportIdolComment",
					"produceRestComments"
				]) if (lr[k]) list.push(...Array.isArray(lr[k]) ? lr[k] : [lr[k]]);
			}
			await translateVoiceField(list, "comment", true);
		};
		const handleAlbumAndGashaVoices = async (data) => {
			const list = [];
			if (Array.isArray(data.produceIdols)) {
				for (const p of data.produceIdols) if (p?.comment) list.push(p.comment);
			}
			if (Array.isArray(data.voices)) {
				for (const v of data.voices) if (v?.characterTrustLevelComment) list.push(v.characterTrustLevelComment);
			}
			if (Array.isArray(data.gashaDraws)) {
				for (const g of data.gashaDraws) if (g?.comment) list.push(g.comment);
			}
			await translateVoiceField(list, "comment", false);
		};
		router.register("GET", ["userProduces"], handleProduceVoices);
		router.register("POST", ["myPage"], handleMyPageVoices);
		router.register("POST", ["fesTop"], handleFesTopVoices);
		router.register("POST", ["produces/actions/(resume|next|endWeek|act|result)", "produces/({num}/audition|concert)/actions/(start|finish)"], handleProduceVoices);
		router.register("POST", ["characterAlbums/characters/{num}", "gashas/{num}/actions/draw"], handleAlbumAndGashaVoices);
	}
	var apiQueueHookInstalled = false;
	function installApiHook(ctx, options = {}) {
		const router = new ApiRouter();
		registerDefaultApiRoutes(router, ctx.repo, ctx.editor, ctx.translator);
		const proto = options.targetArrayProto ?? Array.prototype;
		if (proto === Array.prototype && apiQueueHookInstalled) {
			ctx.diag.setHook("api", "ok", "already installed");
			return {
				name: "api",
				status: "ok",
				detail: "already installed"
			};
		}
		const originPush = proto.push;
		proto.push = function(...args) {
			if (args.length === 1 && args[0] && typeof args[0] === "object" && !Array.isArray(args[0])) {
				const item = args[0];
				if (typeof item.method === "string" && typeof item.path === "string" && typeof item.resolve === "function" && "options" in item) {
					const origResolve = item.resolve;
					const method = item.method;
					const reqPath = item.path;
					item.resolve = async function(res) {
						try {
							const body = res?.body;
							if (body) await router.dispatch(method, reqPath, body);
						} catch (err) {
							ctx.diag.recordError("api", err);
						}
						return origResolve.call(this, res);
					};
				}
			}
			return originPush.apply(this, args);
		};
		if (proto === Array.prototype) apiQueueHookInstalled = true;
		ctx.diag.setHook("api", "ok", "queue guard active (mission/item/skill/title/voice/profile)");
		return {
			name: "api",
			status: "ok",
			detail: "queue guard active (mission/item/skill/title/voice/profile)"
		};
	}
	var FONT_STYLE_ID = "sczh-font-style";
	function addPreloadLink(href) {
		if (typeof document === "undefined" || !document.head) return;
		const link = document.createElement("link");
		link.rel = "preload";
		link.href = href;
		link.as = "font";
		link.type = "font/woff2";
		link.crossOrigin = "anonymous";
		document.head.appendChild(link);
	}
	async function installFontHook(ctx) {
		if (typeof document === "undefined") {
			ctx.diag.setHook("font", "notFound", "DOM unavailable");
			return {
				name: "font",
				status: "notFound",
				detail: "DOM unavailable"
			};
		}
		try {
			const { manifest } = await ctx.repo.getManifest();
			const heitiUrl = ctx.repo.buildAssetUrl("data/font/heiti.woff2", manifest);
			const yuantiUrl = ctx.repo.buildAssetUrl("data/font/yuanti.woff2", manifest);
			if (!heitiUrl && !yuantiUrl) {
				ctx.diag.setHook("font", "notFound", "font assets missing in manifest");
				return {
					name: "font",
					status: "notFound",
					detail: "font assets missing in manifest"
				};
			}
			const rules = [];
			if (heitiUrl) {
				rules.push(`
@font-face {
  font-family: "UDKakugo_SmallPr6-B";
  src: url("${heitiUrl}") format("woff2"),
       url("/assets/fonts/primula-UDKakugo_SmallPr6-B.woff2");
}`);
				addPreloadLink(heitiUrl);
			}
			if (yuantiUrl) {
				rules.push(`
@font-face {
  font-family: "HummingStd-E";
  src: url("${yuantiUrl}") format("woff2"),
       url("/assets/fonts/primula-HummingStd-E.woff2");
}`);
				addPreloadLink(yuantiUrl);
			}
			document.getElementById(FONT_STYLE_ID)?.remove();
			const style = document.createElement("style");
			style.id = FONT_STYLE_ID;
			style.textContent = rules.join("\n");
			(document.head ?? document.documentElement).appendChild(style);
			const detail = [heitiUrl ? "heiti" : "", yuantiUrl ? "yuanti" : ""].filter(Boolean).join("+");
			ctx.diag.setHook("font", "ok", detail);
			return {
				name: "font",
				status: "ok",
				detail
			};
		} catch (err) {
			ctx.diag.recordError("font", err);
			ctx.diag.setHook("font", "failed", err instanceof Error ? err.message : String(err));
			return {
				name: "font",
				status: "failed",
				detail: String(err)
			};
		}
	}
	function mergePhrasesInto(target, phraseMap) {
		let count = 0;
		for (const [key, val] of phraseMap) {
			target[key] = val;
			count += 1;
		}
		return count;
	}
	async function installPhraseHook(ctx) {
		const mod = ctx.modules.PHRASE?.value;
		if (!mod || typeof mod.init !== "function" && !mod._polyglot) {
			ctx.diag.setHook("phrase", "notFound", "PHRASE module unavailable");
			return {
				name: "phrase",
				status: "notFound",
				detail: "PHRASE module unavailable"
			};
		}
		try {
			const phraseMap = await ctx.repo.getPhraseMap();
			if (phraseMap.size === 0) {
				ctx.diag.setHook("phrase", "ok", "0 entries (empty dictionary)");
				return {
					name: "phrase",
					status: "ok",
					detail: "0 entries (empty dictionary)"
				};
			}
			let applied = 0;
			if (mod._polyglot?.phrases) applied = mergePhrasesInto(mod._polyglot.phrases, phraseMap);
			if (typeof mod.init === "function") {
				const origInit = mod.init;
				mod.init = function(phrases, ...rest) {
					if (phrases && typeof phrases === "object") {
						const merged = { ...phrases };
						const count = mergePhrasesInto(merged, phraseMap);
						ctx.diag.setHook("phrase", "ok", `${count} entries injected on init`);
						return origInit.call(this, merged, ...rest);
					}
					return origInit.call(this, phrases, ...rest);
				};
			}
			const detail = applied > 0 ? `${applied} entries applied` : `armed (${phraseMap.size} entries waiting for init)`;
			ctx.diag.setHook("phrase", "ok", detail);
			return {
				name: "phrase",
				status: "ok",
				detail
			};
		} catch (err) {
			ctx.diag.recordError("phrase", err);
			ctx.diag.setHook("phrase", "failed", err instanceof Error ? err.message : String(err));
			return {
				name: "phrase",
				status: "failed",
				detail: String(err)
			};
		}
	}
	async function installResourceHook(ctx) {
		const ezg = ctx.modules.AOBA?.value;
		const proto = ezg?.loaders?.Resource?.prototype;
		const loaderProto = ezg?.loaders?.Loader?.prototype;
		if (!proto || typeof proto._loadElement !== "function") {
			ctx.diag.setHook("resource", "notFound", "Resource.prototype._loadElement unavailable");
			return {
				name: "resource",
				status: "notFound",
				detail: "Resource.prototype._loadElement unavailable"
			};
		}
		try {
			const [{ manifest }, imageMap, pictureMap] = await Promise.all([
				ctx.repo.getManifest(),
				ctx.repo.getImageMap(),
				ctx.repo.getPictureMap()
			]);
			const webp = ctx.modules.WEBP?.value;
			const origLoadElement = proto._loadElement;
			const wrappedLoadElement = function(type) {
				try {
					if (type === "image" && typeof this.name === "string" && typeof this.url === "string") {
						const rule = imageMap.get(this.name);
						if (rule && this.url.endsWith(`v=${rule.version}`)) {
							let relPath = `data/image/${rule.url}`;
							if (webp?.isSupportedWebP?.() && !rule.url.startsWith("tips/") && webp.toWebPUrl) {
								const webpPath = webp.toWebPUrl(relPath);
								if (manifest.files[webpPath]) relPath = webpPath;
							}
							const nextUrl = ctx.repo.buildAssetUrl(relPath, manifest);
							if (nextUrl) {
								this.url = nextUrl;
								this.crossOrigin = "anonymous";
								ctx.diag.recordResourceReplaced();
							}
						} else if (rule) ctx.diag.recordResourceMismatch({
							name: this.name,
							expectedVersion: rule.version,
							actualUrl: this.url
						});
						else if (this.name.startsWith("images/")) {
							const picRel = this.name.slice(7);
							if (pictureMap.has(picRel)) {
								const nextUrl = ctx.repo.buildAssetUrl(`data/picture/${picRel}`, manifest);
								if (nextUrl) {
									this.url = nextUrl;
									this.crossOrigin = "anonymous";
									ctx.diag.recordResourceReplaced();
								}
							}
						}
					}
				} catch (err) {
					ctx.diag.recordError("resource", err);
				}
				return origLoadElement.call(this, type);
			};
			const desc = Object.getOwnPropertyDescriptor(proto, "_loadElement");
			const canMutateProto = !Object.isFrozen(proto) && (!desc || desc.writable || desc.configurable);
			let mode;
			if (canMutateProto) {
				proto._loadElement = wrappedLoadElement;
				mode = "proto";
			} else if (loaderProto && typeof loaderProto._loadResource === "function") {
				const origLoadResource = loaderProto._loadResource;
				loaderProto._loadResource = function(resource, dequeue) {
					if (resource && typeof resource === "object" && !resource.__sczhWrapped) try {
						Object.defineProperty(resource, "_loadElement", {
							configurable: true,
							writable: true,
							value: wrappedLoadElement
						});
						resource.__sczhWrapped = true;
					} catch {}
					return origLoadResource.call(this, resource, dequeue);
				};
				mode = "loader-instance";
			} else throw new Error("Resource.prototype is frozen and Loader.prototype._loadResource unavailable");
			const detail = `mode=${mode}, images=${imageMap.size}, pictures=${pictureMap.size}`;
			ctx.diag.setHook("resource", "ok", detail);
			return {
				name: "resource",
				status: "ok",
				detail
			};
		} catch (err) {
			ctx.diag.recordError("resource", err);
			ctx.diag.setHook("resource", "failed", err instanceof Error ? err.message : String(err));
			return {
				name: "resource",
				status: "failed",
				detail: String(err)
			};
		}
	}
	var PixiTextMatcher = class {
		commonMap;
		typeTextMap;
		commonNoWrapMap = new Map();
		typeTextNoWrapMap = new Map();
		typingTtlMs;
		now;
		activeTyping = [];
		constructor(options = {}) {
			this.commonMap = options.commonMap ?? new Map();
			this.typeTextMap = options.typeTextMap ?? new Map();
			this.typingTtlMs = options.typingTtlMs ?? 1e4;
			this.now = options.now ?? (() => Date.now());
			this.rebuildNoWrapIndexes();
		}
		setDictionaries(commonMap, typeTextMap) {
			this.commonMap = commonMap;
			this.typeTextMap = typeTextMap;
			this.rebuildNoWrapIndexes();
		}
		rebuildNoWrapIndexes() {
			this.commonNoWrapMap.clear();
			for (const [k, v] of this.commonMap) {
				const compact = k.replace(/[\s\u3000]+/g, "");
				if (compact && !this.commonNoWrapMap.has(compact)) this.commonNoWrapMap.set(compact, v);
			}
			this.typeTextNoWrapMap.clear();
			for (const [k, v] of this.typeTextMap) {
				const compact = k.replace(/[\s\u3000]+/g, "");
				if (compact && !this.typeTextNoWrapMap.has(compact)) this.typeTextNoWrapMap.set(compact, v);
			}
		}
		pruneExpired() {
			const current = this.now();
			this.activeTyping = this.activeTyping.filter((item) => item.expiresAt > current);
		}
		recordTyping(text) {
			this.pruneExpired();
			this.activeTyping.push({
				text,
				expiresAt: this.now() + this.typingTtlMs
			});
		}
		isTypingPrefix(text) {
			this.pruneExpired();
			for (const item of this.activeTyping) if (item.text.startsWith(text)) return true;
			return false;
		}
		translateTypeText(text) {
			if (typeof text !== "string" || !text.trim()) return text;
			const key = normalizeLookupText(text);
			const result = this.typeTextMap.get(key) ?? this.typeTextNoWrapMap.get(key.replace(/[\s\u3000]+/g, "")) ?? text;
			this.recordTyping(result);
			return result;
		}
		translateStaticText(text) {
			if (typeof text !== "string" || !text.trim()) return text;
			if (text.startsWith("‌")) return text;
			if (this.isTypingPrefix(text)) return text;
			const key = normalizeLookupText(text);
			const compact = key.replace(/[\s\u3000]+/g, "");
			return this.commonMap.get(key) ?? this.commonNoWrapMap.get(compact) ?? this.typeTextMap.get(key) ?? this.typeTextNoWrapMap.get(compact) ?? text;
		}
	};
	function showToast(message, options = {}) {
		if (typeof document === "undefined") return;
		const hostParent = document.body ?? document.documentElement;
		if (!hostParent) return;
		const variant = options.variant ?? "info";
		const durationMs = options.durationMs ?? 4500;
		const accent = variant === "ai" ? "#a855f7" : variant === "warn" ? "#f59e0b" : "#38bdf8";
		let container = document.getElementById("sczh-toast-host");
		let shadow;
		if (!container) {
			container = document.createElement("div");
			container.id = "sczh-toast-host";
			container.style.cssText = "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:none;";
			shadow = container.attachShadow({ mode: "open" });
			hostParent.appendChild(container);
		} else shadow = container.shadowRoot ?? container.attachShadow({ mode: "open" });
		shadow.innerHTML = "";
		const el = document.createElement("div");
		el.style.cssText = [
			"pointer-events:auto",
			"display:flex",
			"align-items:center",
			"gap:10px",
			"background:rgba(15,23,42,0.92)",
			"color:#f1f5f9",
			`border:1px solid ${accent}`,
			"border-radius:8px",
			"padding:7px 14px",
			"font:12px/1.4 system-ui,-apple-system,sans-serif",
			"box-shadow:0 8px 24px rgba(0,0,0,0.4)"
		].join(";");
		const textSpan = document.createElement("span");
		textSpan.textContent = message;
		const closeBtn = document.createElement("button");
		closeBtn.textContent = "×";
		closeBtn.style.cssText = "background:none;border:none;color:#94a3b8;cursor:pointer;font-size:15px;padding:0 2px;";
		closeBtn.addEventListener("click", () => {
			el.remove();
		});
		el.append(textSpan, closeBtn);
		shadow.appendChild(el);
		if (durationMs > 0) setTimeout(() => {
			el.remove();
		}, durationMs);
	}
	function isMypageVoiceJsonPath(rawPath) {
		return /(?:^|\/)(?:mypage_comments|mypage_conversations)\.json(?:\?|$)/i.test(rawPath);
	}
	function collectCommentNodes(root, out, seen = new Set(), depth = 0) {
		if (!root || typeof root !== "object" || depth > 6 || seen.has(root)) return;
		seen.add(root);
		if (Array.isArray(root)) {
			for (const item of root) collectCommentNodes(item, out, seen, depth + 1);
			return;
		}
		const rec = root;
		if (typeof rec.comment === "string" && rec.comment.trim()) out.push(rec);
		for (const val of Object.values(rec)) if (val && typeof val === "object") collectCommentNodes(val, out, seen, depth + 1);
	}
	function installStoryHook(ctx) {
		const mod = ctx.modules.SCENARIO?.value;
		if (!mod || typeof mod.load !== "function") {
			ctx.diag.setHook("story", "notFound", "SCENARIO.load unavailable");
			return {
				name: "story",
				status: "notFound",
				detail: "SCENARIO.load unavailable"
			};
		}
		const origLoad = mod.load;
		const showHints = ctx.showStoryHints ?? true;
		let compactVoiceMap = null;
		mod.load = async function(rawPath, ...rest) {
			const res = await origLoad.call(this, rawPath, ...rest);
			if (typeof rawPath !== "string" || !Array.isArray(res)) return res;
			if (isMypageVoiceJsonPath(rawPath)) {
				try {
					const [typeTextMap, commMap, nameMap, idolNameMap] = await Promise.all([
						ctx.repo.getTypeTextMap(),
						ctx.repo.getCommStoryMap(),
						ctx.repo.getNameMap(),
						ctx.repo.getIdolNameMap()
					]);
					if (!compactVoiceMap && (typeTextMap.size > 0 || commMap.size > 0)) {
						compactVoiceMap = new Map();
						for (const [k, v] of typeTextMap) {
							const c = k.replace(/[\s\u3000]+/g, "");
							if (c && !compactVoiceMap.has(c)) compactVoiceMap.set(c, v);
						}
						for (const [k, v] of commMap) {
							const c = k.replace(/[\s\u3000]+/g, "");
							if (c && !compactVoiceMap.has(c)) compactVoiceMap.set(c, v);
						}
					}
					const spMap = new Map(nameMap);
					for (const [k, v] of idolNameMap) {
						const pk = k.split(/\s+/);
						const pv = v.split(/\s+/);
						if (pk.length === 2 && pv.length === 2 && pk[1] && !spMap.has(pk[1])) spMap.set(pk[1], pv[1]);
					}
					const nodes = [];
					collectCommentNodes(res, nodes);
					const missedNodes = [];
					for (const rec of nodes) {
						const raw = rec.comment;
						const norm = normalizeLookupText(raw);
						const compact = norm.replace(/[\s\u3000]+/g, "");
						const hit = typeTextMap.get(norm) ?? commMap.get(norm) ?? compactVoiceMap?.get(compact);
						if (hit) rec.comment = hit;
						else {
							ctx.editor.recordUntranslatedVoice(raw);
							missedNodes.push({
								rec,
								norm
							});
						}
						if (typeof rec.speakerName === "string" && rec.speakerName.trim()) rec.speakerName = translateSpeaker(rec.speakerName, spMap);
					}
					if (missedNodes.length > 0 && ctx.translator?.isVoiceTranslationEnabled()) try {
						const mtMap = await ctx.translator.translateVoices(missedNodes.map((m) => m.norm));
						for (const { rec, norm } of missedNodes) {
							const trans = mtMap.get(norm);
							if (trans) rec.comment = trans;
						}
					} catch (mtErr) {
						ctx.diag.recordError("mt:voice", mtErr);
					}
				} catch (err) {
					ctx.diag.recordError("story:voice", err);
				}
				return res;
			}
			if (!isStoryPath(rawPath)) return res;
			const logicalPath = normalizeStoryPath(rawPath);
			try {
				const items = res;
				const preview = ctx.editor.getPreview(logicalPath);
				const [story, commMap, nameMap] = await Promise.all([
					preview ? Promise.resolve(preview) : ctx.repo.getStory(logicalPath),
					ctx.repo.getCommStoryMap(),
					ctx.repo.getNameMap()
				]);
				ctx.editor.recordLoadedStory(logicalPath, items, Boolean(story));
				const stats = applyStoryTranslation(items, {
					story,
					commMap,
					nameMap,
					tagMarker: "‌"
				});
				let translatorLabel = story ? story.translator || (preview ? "本地预览" : "社区译者") : "暂无译文";
				let isAI = Boolean(story?.isAI);
				let matchedTotal = stats.matchedLines + stats.matchedSelects;
				const totalAll = stats.totalLines + stats.totalSelects;
				let coveragePct = stats.coveragePct;
				if (!story && !preview && ctx.translator?.isStoryTranslationEnabled()) {
					if (showHints) showToast("正在实时机翻本段剧情，请稍候...", {
						variant: "info",
						durationMs: 2500
					});
					try {
						const mt = await ctx.translator.translateStory(logicalPath, items);
						if (mt && (mt.texts.size > 0 || mt.selects.size > 0)) {
							let mtCount = 0;
							for (const [idx, trans] of mt.texts) {
								const target = items[idx];
								if (target && typeof target.text === "string" && !target.text.startsWith("‌")) {
									target.text = `‌${trans}`;
									mtCount += 1;
								}
							}
							for (const [idx, trans] of mt.selects) {
								const target = items[idx];
								if (target && typeof target.select === "string") {
									target.select = trans;
									mtCount += 1;
								}
							}
							matchedTotal = Math.min(totalAll, matchedTotal + mtCount);
							coveragePct = totalAll > 0 ? Math.round(matchedTotal / totalAll * 100) : 100;
							translatorLabel = `实时机翻(${mt.engineLabel})`;
							isAI = true;
							if (showHints) {
								const suffix = mt.fromCache ? "（本地缓存）" : mt.usedFallback ? "（已降级至免费保底）" : "";
								showToast(`本段剧情由 ${translatorLabel} 提供${suffix}`, {
									variant: "ai",
									durationMs: 4e3
								});
							}
						}
					} catch (mtErr) {
						ctx.diag.recordError("mt:story", mtErr);
						if (showHints) showToast(`实时机翻失败：${mtErr instanceof Error ? mtErr.message : String(mtErr)}`, {
							variant: "warn",
							durationMs: 4500
						});
					}
				} else if (showHints) {
					if (preview) showToast(`正在预览本地剧情译文：${logicalPath}`, {
						variant: "info",
						durationMs: 3e3
					});
					else if (story?.isAI) showToast(`本段剧情由 ${story.translator} 提供机翻`, {
						variant: "ai",
						durationMs: 4500
					});
					else if (!story) showToast(`该剧情暂无中文译文（可在菜单中开启实时机翻或导出 CSV）`, {
						variant: "warn",
						durationMs: 3500
					});
				}
				ctx.diag.setLastStory({
					path: logicalPath,
					translator: translatorLabel,
					isAI,
					totalLines: totalAll,
					matchedLines: matchedTotal,
					coveragePct,
					updatedAt: new Date().toISOString()
				});
			} catch (err) {
				ctx.diag.recordError("story", err);
			}
			return res;
		};
		ctx.diag.setHook("story", "ok", `SCENARIO#${ctx.modules.SCENARIO.id}`);
		return {
			name: "story",
			status: "ok",
			detail: `SCENARIO#${ctx.modules.SCENARIO.id}`
		};
	}
	async function installTextHook(ctx) {
		const proto = (ctx.modules.AOBA?.value)?.Text?.prototype;
		if (!proto) {
			ctx.diag.setHook("text", "notFound", "ezg.Text.prototype unavailable");
			return {
				name: "text",
				status: "notFound",
				detail: "ezg.Text.prototype unavailable"
			};
		}
		try {
			const [commonMap, typeTextMap, idolNameMap] = await Promise.all([
				ctx.repo.getCommonTextMap(),
				ctx.repo.getTypeTextMap(),
				ctx.repo.getIdolNameMap()
			]);
			const mergedCommon = new Map(commonMap);
			for (const [k, v] of idolNameMap) {
				if (!mergedCommon.has(k)) mergedCommon.set(k, v);
				const compactK = k.replace(/\s+/g, "");
				const compactV = v.replace(/\s+/g, "");
				if (compactK && !mergedCommon.has(compactK)) mergedCommon.set(compactK, compactV);
				const partsK = k.split(/\s+/);
				const partsV = v.split(/\s+/);
				if (partsK.length === 2 && partsV.length === 2 && partsK[1] && !mergedCommon.has(partsK[1])) mergedCommon.set(partsK[1], partsV[1]);
			}
			const matcher = new PixiTextMatcher({
				commonMap: mergedCommon,
				typeTextMap
			});
			let wrappedCount = 0;
			if (typeof proto.typeText === "function") {
				const origTypeText = proto.typeText;
				proto.typeText = function(text, ...rest) {
					if (typeof text === "string") {
						const nextText = matcher.translateTypeText(text);
						if (nextText === text && /[\u3040-\u30ff]/.test(text) && text.trim().length >= 4) ctx.editor?.recordUntranslatedVoice(text);
						return origTypeText.call(this, nextText, ...rest);
					}
					return origTypeText.call(this, text, ...rest);
				};
				wrappedCount += 1;
			}
			if (typeof proto.updateText === "function") {
				const origUpdateText = proto.updateText;
				proto.updateText = function(respectDirty) {
					if (typeof this._text === "string" && this._text.length > 0) {
						const translated = matcher.translateStaticText(this._text);
						if (translated !== this._text) this._text = translated;
					}
					return origUpdateText.call(this, respectDirty);
				};
				wrappedCount += 1;
			}
			const detail = `wrapped=${wrappedCount}, common=${commonMap.size}, typeText=${typeTextMap.size}`;
			ctx.diag.setHook("text", "ok", detail);
			return {
				name: "text",
				status: "ok",
				detail
			};
		} catch (err) {
			ctx.diag.recordError("text", err);
			ctx.diag.setHook("text", "failed", err instanceof Error ? err.message : String(err));
			return {
				name: "text",
				status: "failed",
				detail: String(err)
			};
		}
	}
	function getDefaultExport(mod) {
		if (!mod || typeof mod !== "object" && typeof mod !== "function") return null;
		const rec = mod;
		if (rec.A && typeof rec.A === "object") return rec.A;
		if (rec.default && typeof rec.default === "object") return rec.default;
		const keys = Object.keys(rec);
		if (keys.length === 1) {
			const single = rec[keys[0]];
			if (single && typeof single === "object") return single;
		}
		return rec;
	}
	function matchesFactoryHints(factory, hints) {
		if (typeof factory !== "function") return false;
		let src;
		try {
			src = Function.prototype.toString.call(factory);
		} catch {
			return false;
		}
		return hints.every((hint) => typeof hint === "string" ? src.includes(hint) : hint.test(src));
	}
	var MODULE_SIGNATURES = [
		{
			name: "AOBA",
			hintIds: [77528],
			factoryHints: ["window.ezg", "ezg=null"],
			matchExports: (mod) => {
				const m = mod;
				return Boolean(m && typeof m === "object" && m.loaders && m.Text && m.BLEND_MODES);
			},
			extract: (mod) => mod
		},
		{
			name: "SCENARIO",
			hintIds: [11254],
			factoryHints: [
				"_errorEvent",
				"_handleError",
				"decryptResource"
			],
			matchExports: (mod) => {
				const exp = getDefaultExport(mod);
				return Boolean(exp && typeof exp.load === "function" && typeof exp._handleError === "function" && "_errorEvent" in exp);
			},
			extract: (mod) => getDefaultExport(mod)
		},
		{
			name: "SCENARIO_WRAPPER",
			hintIds: [1935],
			factoryHints: ["SCENARIO_PATH", "ASSET_ROOT"],
			matchExports: (mod) => {
				const exp = getDefaultExport(mod);
				return Boolean(exp && typeof exp.load === "function" && !("_errorEvent" in exp));
			},
			extract: (mod) => getDefaultExport(mod)
		},
		{
			name: "PHRASE",
			hintIds: [40257],
			factoryHints: ["_polyglot", "transformPhrase"],
			matchExports: (mod) => {
				const exp = getDefaultExport(mod);
				return Boolean(exp && typeof exp.init === "function" && typeof exp.t === "function" && "_polyglot" in exp);
			},
			extract: (mod) => getDefaultExport(mod)
		},
		{
			name: "WEBP",
			hintIds: [1025],
			factoryHints: [
				"isSupportedWebP",
				"isWebPResource",
				"toWebPUrl",
				"data:image/webp"
			],
			matchExports: (mod) => {
				const exp = getDefaultExport(mod);
				return Boolean(exp && typeof exp.isSupportedWebP === "function" && typeof exp.toWebPUrl === "function");
			},
			extract: (mod) => getDefaultExport(mod)
		},
		{
			name: "TRACK_MANAGER",
			hintIds: [16375],
			factoryHints: ["TrackManager", "ScenarioPlayer"],
			matchExports: (mod) => {
				const exp = getDefaultExport(mod);
				const rec = mod;
				return Boolean(exp?.TrackManager || rec?.TrackManager);
			},
			extract: (mod) => {
				const exp = getDefaultExport(mod);
				const rec = mod;
				return exp?.TrackManager ?? rec?.TrackManager ?? null;
			}
		},
		{
			name: "ASSET_MAP",
			hintIds: [5431],
			factoryHints: [
				"asset-map.json",
				"getQueryString",
				"_hashMap"
			],
			matchExports: (mod) => {
				const exp = getDefaultExport(mod);
				return Boolean(exp && typeof exp.getQueryString === "function" && typeof exp.getUrls === "function" && "_hashMap" in exp);
			},
			extract: (mod) => getDefaultExport(mod)
		},
		{
			name: "API_CLIENT",
			hintIds: [96525],
			factoryHints: [
				"_encryptRequest",
				"_addQueue",
				"x-maintenance"
			],
			matchExports: (mod) => {
				const exp = getDefaultExport(mod);
				return Boolean(exp && typeof exp.get === "function" && typeof exp.post === "function" && typeof exp.request === "function" && typeof exp._addQueue === "function");
			},
			extract: (mod) => getDefaultExport(mod)
		}
	];
	var SIGNATURE_MAP = new Map(MODULE_SIGNATURES.map((sig) => [sig.name, sig]));
	function getCacheKey(appBundle) {
		return `sczh:mod-ids:${appBundle || "unknown"}`;
	}
	function readCache(storage, appBundle) {
		if (!storage) return {};
		try {
			const raw = storage.getItem(getCacheKey(appBundle));
			if (!raw) return {};
			const parsed = JSON.parse(raw);
			return parsed && typeof parsed === "object" ? parsed : {};
		} catch {
			return {};
		}
	}
	function writeCache(storage, appBundle, map) {
		if (!storage) return;
		try {
			storage.setItem(getCacheKey(appBundle), JSON.stringify(map));
		} catch {}
	}
	function safeRequire(req, id) {
		try {
			return req(id);
		} catch {
			return null;
		}
	}
	function tryIdWithFactoryGuard(req, id, sig) {
		const key = String(id);
		const cached = req.c?.[key] ?? req.c?.[id];
		if (cached && sig.matchExports(cached.exports)) return cached.exports;
		const factory = req.m?.[key] ?? req.m?.[id];
		if (!factory) return null;
		if (!matchesFactoryHints(factory, sig.factoryHints)) return null;
		const loaded = safeRequire(req, id);
		return sig.matchExports(loaded) ? loaded : null;
	}
	function locateModule(req, name, options = {}) {
		const sig = SIGNATURE_MAP.get(name);
		if (!sig) return {
			name,
			id: null,
			value: null,
			source: "not-found"
		};
		if (name === "AOBA" && options.ezgFallback && sig.matchExports(options.ezgFallback)) return {
			name,
			id: "window.ezg",
			value: sig.extract(options.ezgFallback),
			source: "ezg-boot"
		};
		if (!req) return {
			name,
			id: null,
			value: null,
			source: "not-found"
		};
		const storage = options.storage !== void 0 ? options.storage : typeof sessionStorage !== "undefined" ? sessionStorage : null;
		const cache = readCache(storage, options.appBundle);
		const cachedId = cache[name];
		if (cachedId) {
			const mod = tryIdWithFactoryGuard(req, cachedId, sig);
			if (mod) return {
				name,
				id: cachedId,
				value: sig.extract(mod),
				source: "session-cache"
			};
		}
		const hintIds = [...options.extraHints?.[name] ?? [], ...sig.hintIds];
		for (const id of hintIds) {
			const mod = tryIdWithFactoryGuard(req, id, sig);
			if (mod) {
				const strId = String(id);
				cache[name] = strId;
				writeCache(storage, options.appBundle, cache);
				return {
					name,
					id: strId,
					value: sig.extract(mod),
					source: "hint"
				};
			}
		}
		if (req.c) for (const id of Object.keys(req.c)) {
			const entry = req.c[id];
			if (entry && sig.matchExports(entry.exports)) {
				cache[name] = id;
				writeCache(storage, options.appBundle, cache);
				return {
					name,
					id,
					value: sig.extract(entry.exports),
					source: "loaded-cache"
				};
			}
		}
		if (req.m) for (const id of Object.keys(req.m)) {
			if (!matchesFactoryHints(req.m[id], sig.factoryHints)) continue;
			const loaded = safeRequire(req, id);
			if (sig.matchExports(loaded)) {
				cache[name] = id;
				writeCache(storage, options.appBundle, cache);
				return {
					name,
					id,
					value: sig.extract(loaded),
					source: "factory-scan"
				};
			}
		}
		return {
			name,
			id: null,
			value: null,
			source: "not-found"
		};
	}
	function locateAllModules(req, options = {}) {
		const results = {};
		for (const sig of MODULE_SIGNATURES) results[sig.name] = locateModule(req, sig.name, options);
		return results;
	}
	var MT_CONFIG_STORAGE_KEY = "sczh:mt-config:v1";
	var MT_PRESETS = [
		{
			id: "free-google",
			label: "免 Key 免费保底（多源自动防限流）",
			protocol: "free-google",
			defaultBaseUrl: "https://clients5.google.com/translate_a/t",
			defaultModel: "multi-free-nmt",
			requiresKey: false,
			hint: "零配置开箱即用：自动依次尝试 Google Chrome 扩展源 → Google GTX → MyMemory 独立源（防 429 限流，内置 283 角色译名修正）。"
		},
		{
			id: "opencode-go",
			label: "OpenCode Go 套餐（自动带 Session 头）",
			protocol: "openai-compat",
			defaultBaseUrl: "https://opencode.ai/zen/go/v1/chat/completions",
			defaultModel: "deepseek-v4.1-flash",
			requiresKey: true,
			hint: "填入 OpenCode Console 的 Go API Key，脚本会自动附带每次会话唯一的 x-opencode-session 头。"
		},
		{
			id: "gemini",
			label: "Google Gemini（免费层推荐）",
			protocol: "gemini",
			defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
			defaultModel: "gemini-2.5-flash",
			requiresKey: true,
			hint: "可在 Google AI Studio 免费申请 API Key，二次元日文语境与角色口癖表现极佳。"
		},
		{
			id: "zhipu",
			label: "智谱 BigModel（国内直连 · 免费模型）",
			protocol: "openai-compat",
			defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
			defaultModel: "glm-4-flash",
			requiresKey: true,
			hint: "国内直连无需代理；glm-4-flash 在智谱开放平台提供免费调用额度，注册领 Key 即可使用。"
		},
		{
			id: "siliconflow",
			label: "硅基流动 SiliconFlow（国内直连）",
			protocol: "openai-compat",
			defaultBaseUrl: "https://api.siliconflow.cn/v1/chat/completions",
			defaultModel: "Qwen/Qwen2.5-7B-Instruct",
			requiresKey: true,
			hint: "国内直连稳定，Qwen2.5-7B-Instruct 等小模型免费/极低成本。"
		},
		{
			id: "deepseek",
			label: "DeepSeek API",
			protocol: "openai-compat",
			defaultBaseUrl: "https://api.deepseek.com/v1/chat/completions",
			defaultModel: "deepseek-chat",
			requiresKey: true,
			hint: "中文文风非常自然，价格极低（约 1 分钱可翻数十篇剧情）。"
		},
		{
			id: "openrouter",
			label: "OpenRouter（支持 :free 免费模型）",
			protocol: "openai-compat",
			defaultBaseUrl: "https://openrouter.ai/api/v1/chat/completions",
			defaultModel: "qwen/qwen3-8b:free",
			requiresKey: true,
			hint: "注册后可用带 :free 后缀的免费模型（模型列表可按需修改）。"
		},
		{
			id: "ollama",
			label: "本地 Ollama（完全免费离线）",
			protocol: "openai-compat",
			defaultBaseUrl: "http://127.0.0.1:11434/v1/chat/completions",
			defaultModel: "qwen2.5:7b",
			requiresKey: false,
			hint: "连接本机 Ollama 服务，完全免费离线且不限速（无需填 API Key）。"
		},
		{
			id: "caiyun",
			label: "彩云小译（自填 Token）",
			protocol: "caiyun",
			defaultBaseUrl: "https://api.interpreter.caiyunai.com/v1/translator",
			defaultModel: "ja2zh",
			requiresKey: true,
			hint: "老版汉化同款极速引擎，需填入自己申请的彩云小译 Token。"
		},
		{
			id: "openai-compat",
			label: "自定义 OpenAI 兼容接口",
			protocol: "openai-compat",
			defaultBaseUrl: "https://api.openai.com/v1/chat/completions",
			defaultModel: "gpt-4o-mini",
			requiresKey: true,
			hint: "支持任意兼容 /v1/chat/completions 的第三方中转站或自建服务。"
		}
	];
	function getMtPreset(id) {
		return MT_PRESETS.find((p) => p.id === id) ?? MT_PRESETS[0];
	}
	function createDefaultMtConfig() {
		const preset = getMtPreset("free-google");
		return {
			enabled: true,
			translateStories: true,
			translateVoices: true,
			fallbackToFree: true,
			provider: preset.id,
			baseUrl: preset.defaultBaseUrl,
			apiKey: "",
			model: preset.defaultModel,
			timeoutMs: 3e4,
			customPrompt: ""
		};
	}
	function loadMtConfig() {
		const defaults = createDefaultMtConfig();
		try {
			const raw = localStorage.getItem(MT_CONFIG_STORAGE_KEY);
			if (!raw) return defaults;
			const parsed = JSON.parse(raw);
			const provider = parsed.provider && MT_PRESETS.some((p) => p.id === parsed.provider) ? parsed.provider : defaults.provider;
			const preset = getMtPreset(provider);
			return {
				enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : defaults.enabled,
				translateStories: typeof parsed.translateStories === "boolean" ? parsed.translateStories : defaults.translateStories,
				translateVoices: typeof parsed.translateVoices === "boolean" ? parsed.translateVoices : defaults.translateVoices,
				fallbackToFree: typeof parsed.fallbackToFree === "boolean" ? parsed.fallbackToFree : defaults.fallbackToFree,
				provider,
				baseUrl: typeof parsed.baseUrl === "string" && parsed.baseUrl.trim() ? parsed.baseUrl.trim() : preset.defaultBaseUrl,
				apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "",
				model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model.trim() : preset.defaultModel,
				timeoutMs: typeof parsed.timeoutMs === "number" && parsed.timeoutMs >= 3e3 && parsed.timeoutMs <= 12e4 ? parsed.timeoutMs : defaults.timeoutMs,
				customPrompt: typeof parsed.customPrompt === "string" ? parsed.customPrompt : ""
			};
		} catch {
			return defaults;
		}
	}
	function saveMtConfig(config) {
		try {
			localStorage.setItem(MT_CONFIG_STORAGE_KEY, JSON.stringify(config));
		} catch {}
	}
	function gmRequest(req) {
		return new Promise((resolve, reject) => {
			GM_xmlhttpRequest({
				method: req.method ?? "GET",
				url: req.url,
				headers: req.headers,
				data: req.body,
				anonymous: req.anonymous,
				timeout: req.timeoutMs ?? 3e4,
				onload: (res) => {
					resolve({
						status: res.status,
						text: res.responseText
					});
				},
				onerror: (err) => {
					reject(new Error(`GM_xmlhttpRequest network error: ${String(err?.error ?? err)}`));
				},
				ontimeout: () => {
					reject(new Error(`Request timeout (${req.timeoutMs ?? 3e4}ms)`));
				}
			});
		});
	}
	async function fetchRequest(req) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 3e4);
		try {
			const res = await fetch(req.url, {
				method: req.method ?? "GET",
				headers: req.headers,
				body: req.body,
				signal: controller.signal
			});
			const text = await res.text();
			return {
				status: res.status,
				text
			};
		} finally {
			clearTimeout(timer);
		}
	}
	var defaultMtHttpClient = (req) => {
		if (typeof GM_xmlhttpRequest === "function") return gmRequest(req);
		return fetchRequest(req);
	};
	var DEFAULT_SYSTEM_PROMPT = [
		"你是《偶像大师 闪耀色彩》（THE iDOLM@STER SHINY COLORS）的专业日译中本地化译者。",
		"请将用户提供的日文台词数组逐条翻译为自然、贴合角色性格与口癖的简体中文。",
		"规则：",
		"1. 常用译名：プロデューサー→制作人，283プロ→283事务所，櫻木真乃→樱木真乃，風野灯織→风野灯织，八宮めぐる→八宫巡，月岡恋鐘→月冈恋钟，田中摩美々→田中摩美美，白瀬咲耶→白濑咲耶，三峰結華→三峰结华，幽谷霧子→幽谷雾子，小宮果穂→小宫果穗，園田智代子→园田智代子，西城樹里→西城树里，杜野凛世→杜野凛世，有栖川夏葉→有栖川夏叶，大崎甘奈→大崎甘奈，大崎甜花→大崎甜花，桑山千雪→桑山千雪，芹沢あさひ→芹泽朝日，黛冬優子→黛冬优子，和泉愛依→和泉爱依，浅倉透→浅仓透，樋口円香→樋口圆香，福丸小糸→福丸小糸，市川雛菜→市川雏菜，七草にちか→七草日花，緋田美琴→绯田美琴，斑鳩ルカ→斑鸠路加，鈴木羽那→铃木羽那，郁田はるき→郁田春希，はづき→叶月。",
		"2. 尽量保留原文的换行符 \\n 节奏，不要合并或删减条目。",
		"3. 严格只输出一个 JSON 字符串数组（例如 [\"译文1\",\"译文2\"]），数组长度必须与输入条数完全一致，不要包含 Markdown 代码块或任何解释。"
	].join("\n");
	var FREE_POST_REPLACEMENTS = [
		[/制片人/g, "制作人"],
		[/生产商/g, "制作人"],
		[/生产者/g, "制作人"],
		[/283\s*Pro/gi, "283事务所"],
		[/樱木真野/g, "樱木真乃"],
		[/风野灯织|风野绯织/g, "风野灯织"],
		[/\bToori\b|\bHiori\b/gi, "灯织"],
		[/\bMano\b/gi, "真乃"],
		[/\bMeguru\b/gi, "巡"],
		[/\bKogane\b/gi, "恋钟"],
		[/\bMamimi\b/gi, "摩美美"],
		[/\bNichika\b/gi, "日花"],
		[/\bMikoto\b/gi, "美琴"],
		[/\bRuka\b|\bLuca\b/gi, "路加"],
		[/八宫巡|八宫惠/g, "八宫巡"],
		[/月冈恋钟|月冈小金/g, "月冈恋钟"],
		[/田中真美美|田中麻美/g, "田中摩美美"],
		[/七草日花|七草妮可|七草日香/g, "七草日花"],
		[/斑鸠卢卡|斑鸠露卡/g, "斑鸠路加"],
		[/铃木花|铃木羽奈/g, "铃木羽那"],
		[/郁田春树/g, "郁田春希"],
		[/黛冬子/g, "黛冬优子"]
	];
	function applyShinyTermsFix(text) {
		let out = text;
		for (const [re, rep] of FREE_POST_REPLACEMENTS) out = out.replace(re, rep);
		return out.trim();
	}
	function buildUserPayload(lines) {
		const arr = lines.map((l, idx) => ({
			i: idx,
			s: l.speaker || "",
			t: l.text
		}));
		return `请按顺序翻译以下 ${lines.length} 条台词，只返回长度为 ${lines.length} 的 JSON 字符串数组：\n${JSON.stringify(arr)}`;
	}
	function parseLlmArrayResponse(raw, expectedLength) {
		const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
		const tryParse = (candidate) => {
			try {
				const parsed = JSON.parse(candidate);
				if (Array.isArray(parsed) && parsed.length === expectedLength) return parsed.map((v) => {
					if (typeof v === "string") return v;
					if (v && typeof v === "object" && "t" in v && typeof v.t === "string") return v.t;
					return String(v ?? "");
				});
				if (parsed && typeof parsed === "object") {
					for (const val of Object.values(parsed)) if (Array.isArray(val) && val.length === expectedLength) return val.map((x) => String(x ?? ""));
				}
			} catch {}
			return null;
		};
		const direct = tryParse(cleaned);
		if (direct) return direct;
		const firstBracket = cleaned.indexOf("[");
		const lastBracket = cleaned.lastIndexOf("]");
		if (firstBracket >= 0 && lastBracket > firstBracket) {
			const sliced = tryParse(cleaned.slice(firstBracket, lastBracket + 1));
			if (sliced) return sliced;
		}
		if (expectedLength === 1 && cleaned.length > 0) return [cleaned.replace(/^["']|["']$/g, "")];
		throw new Error(`LLM 返回格式无法解析为长度为 ${expectedLength} 的 JSON 数组`);
	}
	var cachedOpenCodeSessionId = null;
	function getOpenCodeSessionId() {
		if (cachedOpenCodeSessionId) return cachedOpenCodeSessionId;
		try {
			if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
				cachedOpenCodeSessionId = crypto.randomUUID();
				return cachedOpenCodeSessionId;
			}
		} catch {}
		cachedOpenCodeSessionId = `sczh-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
		return cachedOpenCodeSessionId;
	}
	function normalizeOpenAiEndpoint(baseUrl) {
		const trimmed = baseUrl.trim().replace(/\/+$/, "");
		if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
		if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`;
		return trimmed;
	}
	async function translateWithOpenAiCompat(options) {
		const { config, lines } = options;
		const http = options.http ?? defaultMtHttpClient;
		const preset = getMtPreset(config.provider);
		if (preset.requiresKey && !config.apiKey) throw new Error(`${preset.label} 尚未填写 API Key`);
		const url = normalizeOpenAiEndpoint(config.baseUrl || preset.defaultBaseUrl);
		const headers = { "Content-Type": "application/json" };
		if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
		if (config.provider === "openrouter") {
			headers["HTTP-Referer"] = "https://shinycolors.enza.fun/";
			headers["X-Title"] = "ShinyColors-zh";
		}
		if (config.provider === "opencode-go" || /opencode\.ai/i.test(url)) headers["x-opencode-session"] = getOpenCodeSessionId();
		const systemPrompt = config.customPrompt.trim() || DEFAULT_SYSTEM_PROMPT;
		const res = await http({
			url,
			method: "POST",
			headers,
			body: JSON.stringify({
				model: config.model || preset.defaultModel,
				temperature: .3,
				messages: [{
					role: "system",
					content: systemPrompt
				}, {
					role: "user",
					content: buildUserPayload(lines)
				}]
			}),
			timeoutMs: config.timeoutMs
		});
		if (res.status < 200 || res.status >= 300) throw new Error(`OpenAI 兼容接口 HTTP ${res.status}: ${res.text.slice(0, 180)}`);
		const content = JSON.parse(res.text).choices?.[0]?.message?.content;
		if (!content) throw new Error("OpenAI 兼容接口返回内容为空");
		return parseLlmArrayResponse(content, lines.length);
	}
	async function translateWithGemini(options) {
		const { config, lines } = options;
		const http = options.http ?? defaultMtHttpClient;
		if (!config.apiKey) throw new Error("Google Gemini 尚未填写 API Key");
		const base = (config.baseUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
		const model = (config.model || "gemini-2.5-flash").replace(/^models\//, "");
		const url = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
		const systemPrompt = config.customPrompt.trim() || DEFAULT_SYSTEM_PROMPT;
		const res = await http({
			url,
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				systemInstruction: { parts: [{ text: systemPrompt }] },
				contents: [{
					role: "user",
					parts: [{ text: buildUserPayload(lines) }]
				}],
				generationConfig: {
					temperature: .3,
					responseMimeType: "application/json"
				}
			}),
			timeoutMs: config.timeoutMs
		});
		if (res.status < 200 || res.status >= 300) throw new Error(`Gemini API HTTP ${res.status}: ${res.text.slice(0, 180)}`);
		const content = JSON.parse(res.text).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
		if (!content.trim()) throw new Error("Gemini API 返回内容为空");
		return parseLlmArrayResponse(content, lines.length);
	}
	async function translateWithCaiyun(options) {
		const { config, lines } = options;
		const http = options.http ?? defaultMtHttpClient;
		if (!config.apiKey) throw new Error("彩云小译尚未填写 Token");
		const res = await http({
			url: config.baseUrl || "https://api.interpreter.caiyunai.com/v1/translator",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-authorization": `token ${config.apiKey}`
			},
			body: JSON.stringify({
				source: lines.map((l) => l.text),
				trans_type: config.model || "ja2zh",
				request_id: `sczh-${Date.now()}`,
				detect: false
			}),
			timeoutMs: config.timeoutMs
		});
		if (res.status < 200 || res.status >= 300) throw new Error(`彩云小译 HTTP ${res.status}: ${res.text.slice(0, 180)}`);
		const data = JSON.parse(res.text);
		if (!Array.isArray(data.target) || data.target.length !== lines.length) throw new Error("彩云小译返回数组长度不匹配");
		return data.target.map(applyShinyTermsFix);
	}
	async function translateWithFreeGoogle(options) {
		const { config, lines } = options;
		const http = options.http ?? defaultMtHttpClient;
		const errors = [];
		try {
			const out = [];
			for (let i = 0; i < lines.length; i += 25) {
				const slice = lines.slice(i, i + 25);
				const res = await http({
					url: "https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=ja&tl=zh-CN",
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
					body: slice.map((l) => `q=${encodeURIComponent(l.text)}`).join("&"),
					anonymous: true,
					timeoutMs: config.timeoutMs
				});
				if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
				const parsed = JSON.parse(res.text);
				if (Array.isArray(parsed) && parsed.length === slice.length) for (const item of parsed) {
					const text = Array.isArray(item) ? String(item[0] ?? "") : String(item ?? "");
					out.push(applyShinyTermsFix(text));
				}
				else throw new Error("unexpected response shape");
			}
			return out;
		} catch (err) {
			errors.push(`clients5: ${err instanceof Error ? err.message : String(err)}`);
		}
		try {
			const endpoint = "https://translate.googleapis.com/translate_a/single";
			const requestGtx = async (queryText) => {
				const res = await http({
					url: `${endpoint}?client=gtx&sl=ja&tl=zh-CN&dt=t`,
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
					body: `q=${encodeURIComponent(queryText)}`,
					anonymous: true,
					timeoutMs: config.timeoutMs
				});
				if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
				const parsed = JSON.parse(res.text);
				return (Array.isArray(parsed[0]) ? parsed[0] : []).map((seg) => typeof seg?.[0] === "string" ? seg[0] : "").join("");
			};
			if (lines.length === 1) return [applyShinyTermsFix(await requestGtx(lines[0].text) || lines[0].text)];
			const out = new Array(lines.length);
			let cursor = 0;
			while (cursor < lines.length) {
				const batchIdx = [];
				const parts = [];
				let charCount = 0;
				while (cursor < lines.length) {
					const encoded = lines[cursor].text.replace(/\r?\n/g, " ⏎ ");
					const piece = `[${cursor}] ${encoded}`;
					if (batchIdx.length > 0 && charCount + piece.length > 1200) break;
					batchIdx.push(cursor);
					parts.push(piece);
					charCount += piece.length + 1;
					cursor += 1;
				}
				const mergedText = await requestGtx(parts.join("\n"));
				const matched = new Map();
				const markerRe = /(?:【|\[)\s*(\d+)\s*(?:】|\])\s*([\s\S]*?)(?=(?:【|\[)\s*\d+\s*(?:】|\])|$)/g;
				let m;
				while ((m = markerRe.exec(mergedText)) !== null) matched.set(Number(m[1]), applyShinyTermsFix(m[2].replace(/\s*⏎\s*/g, "\n")));
				for (const idx of batchIdx) out[idx] = matched.get(idx) ?? applyShinyTermsFix(await requestGtx(lines[idx].text));
			}
			return out;
		} catch (err) {
			errors.push(`gtx: ${err instanceof Error ? err.message : String(err)}`);
		}
		try {
			const out = new Array(lines.length);
			let cursor = 0;
			while (cursor < lines.length) {
				const batchIdx = [];
				const parts = [];
				let charCount = 0;
				while (cursor < lines.length) {
					const encoded = lines[cursor].text.replace(/\r?\n/g, " ⏎ ");
					const piece = `[${cursor}] ${encoded}`;
					if (batchIdx.length > 0 && charCount + piece.length > 420) break;
					batchIdx.push(cursor);
					parts.push(piece);
					charCount += piece.length + 1;
					cursor += 1;
				}
				const queryText = batchIdx.length === 1 ? lines[batchIdx[0]].text : parts.join("\n");
				const res = await http({
					url: `https://api.mymemory.translated.net/get?q=${encodeURIComponent(queryText)}&langpair=ja|zh-CN`,
					method: "GET",
					anonymous: true,
					timeoutMs: config.timeoutMs
				});
				if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
				const translated = JSON.parse(res.text).responseData?.translatedText;
				if (!translated) throw new Error("empty translatedText");
				if (batchIdx.length === 1) out[batchIdx[0]] = applyShinyTermsFix(translated);
				else {
					const matched = new Map();
					const markerRe = /(?:【|\[)\s*(\d+)\s*(?:】|\])\s*([\s\S]*?)(?=(?:【|\[)\s*\d+\s*(?:】|\])|$)/g;
					let m;
					while ((m = markerRe.exec(translated)) !== null) matched.set(Number(m[1]), applyShinyTermsFix(m[2].replace(/\s*⏎\s*/g, "\n")));
					for (const idx of batchIdx) out[idx] = matched.get(idx) ?? applyShinyTermsFix(lines[idx].text);
				}
			}
			return out;
		} catch (err) {
			errors.push(`mymemory: ${err instanceof Error ? err.message : String(err)}`);
		}
		throw new Error(`免费保底 3 个通道均失败 (${errors.join(" | ")})`);
	}
	async function dispatchProviderTranslate(options) {
		const preset = getMtPreset(options.config.provider);
		const chunkSize = preset.protocol === "free-google" || preset.protocol === "caiyun" ? 40 : 25;
		if (options.lines.length <= chunkSize) return runSingleChunk(preset.protocol, options);
		const results = [];
		for (let i = 0; i < options.lines.length; i += chunkSize) {
			const slice = options.lines.slice(i, i + chunkSize);
			const translated = await runSingleChunk(preset.protocol, {
				...options,
				lines: slice
			});
			results.push(...translated);
		}
		return results;
	}
	function runSingleChunk(protocol, options) {
		switch (protocol) {
			case "gemini": return translateWithGemini(options);
			case "openai-compat": return translateWithOpenAiCompat(options);
			case "caiyun": return translateWithCaiyun(options);
			default: return translateWithFreeGoogle(options);
		}
	}
	function quickHash(text) {
		let h = 0x811c9dc5;
		for (let i = 0; i < text.length; i++) {
			h ^= text.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return (h >>> 0).toString(16).padStart(8, "0");
	}
	var RuntimeTranslator = class {
		cache;
		http;
		config;
		inflightStories = new Map();
		constructor(options = {}) {
			this.cache = options.cache ?? new IndexedDbCache("sczh-mt-cache-v1");
			this.http = options.http ?? defaultMtHttpClient;
			this.config = options.config ?? loadMtConfig();
		}
		getConfig() {
			return { ...this.config };
		}
		updateConfig(next) {
			this.config = { ...next };
			saveMtConfig(this.config);
		}
		isStoryTranslationEnabled() {
			return this.config.enabled && this.config.translateStories;
		}
		isVoiceTranslationEnabled() {
			return this.config.enabled && this.config.translateVoices;
		}
		async clearCache() {
			await this.cache.clear();
		}
		formatEngineLabel(cfg, fallbackUsed) {
			if (fallbackUsed || cfg.provider === "free-google") return "免费保底(Google)";
			const preset = getMtPreset(cfg.provider);
			const shortName = preset.id === "openai-compat" ? "自定义AI" : preset.id.toUpperCase();
			return cfg.model ? `${shortName}/${cfg.model}` : shortName;
		}
		async runWithFallback(lines) {
			const cfg = this.config;
			const preset = getMtPreset(cfg.provider);
			if (cfg.provider === "free-google" || !preset.requiresKey || Boolean(cfg.apiKey)) try {
				return {
					outputs: await dispatchProviderTranslate({
						config: cfg,
						lines,
						http: this.http
					}),
					engineLabel: this.formatEngineLabel(cfg, false),
					usedFallback: false
				};
			} catch (primaryErr) {
				if (!cfg.fallbackToFree || cfg.provider === "free-google") throw primaryErr;
				return {
					outputs: await translateWithFreeGoogle({
						config: cfg,
						lines,
						http: this.http
					}),
					engineLabel: this.formatEngineLabel(cfg, true),
					usedFallback: true
				};
			}
			if (cfg.fallbackToFree) return {
				outputs: await translateWithFreeGoogle({
					config: cfg,
					lines,
					http: this.http
				}),
				engineLabel: this.formatEngineLabel(cfg, true),
				usedFallback: true
			};
			throw new Error(`${preset.label} 尚未填写 API Key，且未开启免费保底`);
		}
		async translateStory(logicalPath, items) {
			if (!this.isStoryTranslationEnabled()) return null;
			const normPath = normalizeStoryPath(logicalPath);
			const lineSlots = [];
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (!item || typeof item !== "object") continue;
				if (typeof item.text === "string" && item.text.trim()) lineSlots.push({
					index: i,
					kind: "text",
					input: {
						text: normalizeLookupText(item.text),
						speaker: item.speaker
					}
				});
				else if (typeof item.select === "string" && item.select.trim()) lineSlots.push({
					index: i,
					kind: "select",
					input: { text: normalizeLookupText(item.select) }
				});
			}
			if (lineSlots.length === 0) return null;
			const contentHash = quickHash(`${this.config.provider}:${this.config.model}:${lineSlots.map((s) => s.input.text).join("")}`);
			const cacheKey = `mt:story:${normPath}`;
			const cached = await this.cache.get(cacheKey);
			if (cached && cached.hash === contentHash && cached.value) return {
				texts: new Map(cached.value.texts),
				selects: new Map(cached.value.selects),
				engineLabel: cached.value.engineLabel,
				fromCache: true,
				usedFallback: cached.value.engineLabel.includes("免费保底")
			};
			const existing = this.inflightStories.get(cacheKey);
			if (existing) return existing;
			const job = (async () => {
				const { outputs, engineLabel, usedFallback } = await this.runWithFallback(lineSlots.map((s) => s.input));
				const texts = new Map();
				const selects = new Map();
				for (let i = 0; i < lineSlots.length; i++) {
					const slot = lineSlots[i];
					const translated = outputs[i]?.trim();
					if (!translated) continue;
					if (slot.kind === "text") texts.set(slot.index, translated);
					else selects.set(slot.index, translated);
				}
				await this.cache.set(cacheKey, contentHash, {
					texts: Array.from(texts.entries()),
					selects: Array.from(selects.entries()),
					engineLabel
				});
				return {
					texts,
					selects,
					engineLabel,
					fromCache: false,
					usedFallback
				};
			})().finally(() => {
				this.inflightStories.delete(cacheKey);
			});
			this.inflightStories.set(cacheKey, job);
			return job;
		}
		async translateVoices(rawTexts) {
			const result = new Map();
			if (!this.isVoiceTranslationEnabled() || rawTexts.length === 0) return result;
			const unique = [];
			const seen = new Set();
			for (const t of rawTexts) {
				const norm = normalizeLookupText(t);
				if (norm && !seen.has(norm)) {
					seen.add(norm);
					unique.push(norm);
				}
			}
			const pending = [];
			for (const norm of unique) {
				const key = `mt:voice:${quickHash(norm)}`;
				const cached = await this.cache.get(key);
				if (cached && cached.value) result.set(norm, cached.value);
				else pending.push(norm);
			}
			if (pending.length === 0) return result;
			const slice = pending.slice(0, 60);
			const { outputs } = await this.runWithFallback(slice.map((t) => ({ text: t })));
			for (let i = 0; i < slice.length; i++) {
				const norm = slice[i];
				const trans = outputs[i]?.trim();
				if (trans) {
					result.set(norm, trans);
					await this.cache.set(`mt:voice:${quickHash(norm)}`, this.config.provider, trans);
				}
			}
			return result;
		}
		async testConnection() {
			const start = Date.now();
			try {
				const { outputs, engineLabel, usedFallback } = await this.runWithFallback([{
					text: "プロデューサーさん、今日も一緒に頑張りましょうね！",
					speaker: "真乃"
				}]);
				return {
					ok: true,
					engineLabel,
					sampleOutput: outputs[0],
					elapsedMs: Date.now() - start,
					usedFallback
				};
			} catch (err) {
				return {
					ok: false,
					engineLabel: this.formatEngineLabel(this.config, false),
					elapsedMs: Date.now() - start,
					error: err instanceof Error ? err.message : String(err)
				};
			}
		}
	};
	var DiagnosticsStore = class {
		state;
		listeners = new Set();
		constructor() {
			this.state = {
				version: APP_VERSION,
				enabled: true,
				boot: {
					require: {
						captured: false,
						method: "timeout",
						chunkVar: null,
						appBundle: null,
						elapsedMs: 0
					},
					ezg: {
						captured: false,
						method: "timeout",
						elapsedMs: 0
					}
				},
				modules: {},
				hooks: {
					story: { status: "pending" },
					phrase: { status: "pending" },
					text: { status: "pending" },
					api: { status: "pending" },
					resource: { status: "pending" },
					font: { status: "pending" }
				},
				data: {
					source: "未加载",
					version: "-",
					upstreamCommit: "-"
				},
				lastStory: null,
				resourceReplacedCount: 0,
				resourceMismatches: [],
				errors: []
			};
		}
		getSnapshot() {
			return this.state;
		}
		subscribe(listener) {
			this.listeners.add(listener);
			return () => this.listeners.delete(listener);
		}
		emit() {
			for (const fn of this.listeners) try {
				fn();
			} catch {}
		}
		setEnabled(enabled) {
			this.state.enabled = enabled;
			this.emit();
		}
		setRequireBoot(res) {
			this.state.boot.require = {
				captured: Boolean(res.require),
				method: res.method,
				chunkVar: res.chunkVar,
				appBundle: res.appBundle,
				elapsedMs: res.elapsedMs
			};
			this.emit();
		}
		setEzgBoot(res) {
			this.state.boot.ezg = {
				captured: Boolean(res.ezg),
				method: res.method,
				elapsedMs: res.elapsedMs
			};
			this.emit();
		}
		setModules(results) {
			const summary = {};
			for (const [name, res] of Object.entries(results)) summary[name] = {
				id: res.id,
				source: res.source
			};
			this.state.modules = summary;
			this.emit();
		}
		setHook(name, status, detail) {
			this.state.hooks[name] = {
				status,
				detail
			};
			this.emit();
		}
		setDataInfo(info) {
			this.state.data = {
				...this.state.data,
				...info
			};
			this.emit();
		}
		setLastStory(entry) {
			this.state.lastStory = entry;
			this.emit();
		}
		recordResourceReplaced() {
			this.state.resourceReplacedCount += 1;
			this.emit();
		}
		recordResourceMismatch(item) {
			if (this.state.resourceMismatches.length >= 20) return;
			if (this.state.resourceMismatches.some((x) => x.name === item.name)) return;
			this.state.resourceMismatches.push(item);
			this.emit();
		}
		recordError(scope, err) {
			const message = err instanceof Error ? err.message : String(err);
			this.state.errors.push({
				scope,
				message,
				at: new Date().toISOString()
			});
			if (this.state.errors.length > 50) this.state.errors.shift();
			this.emit();
		}
	};
	var DiagnosticsPanel = class {
		store;
		actions;
		host = null;
		shadow = null;
		visible = false;
		unsubscribe = null;
		constructor(store, actions) {
			this.store = store;
			this.actions = actions;
		}
		toggle() {
			if (this.visible) this.hide();
			else this.show();
		}
		show() {
			if (typeof document === "undefined") return;
			if (!this.host) this.mount();
			this.visible = true;
			if (this.host) this.host.style.display = "block";
			this.render();
		}
		hide() {
			this.visible = false;
			if (this.host) this.host.style.display = "none";
		}
		destroy() {
			this.unsubscribe?.();
			this.unsubscribe = null;
			this.host?.remove();
			this.host = null;
			this.shadow = null;
		}
		mount() {
			const host = document.createElement("div");
			host.id = "sczh-diagnostics-host";
			host.style.position = "fixed";
			host.style.top = "16px";
			host.style.right = "16px";
			host.style.zIndex = "2147483647";
			host.style.display = "none";
			const shadow = host.attachShadow({ mode: "open" });
			(document.body ?? document.documentElement).appendChild(host);
			this.host = host;
			this.shadow = shadow;
			this.unsubscribe = this.store.subscribe(() => {
				if (this.visible) this.render();
			});
		}
		render() {
			if (!this.shadow) return;
			const s = this.store.getSnapshot();
			const badgeColor = (status) => {
				if (status === "ok" || status === "true") return "#22c55e";
				if (status === "failed") return "#ef4444";
				if (status === "notFound") return "#f59e0b";
				return "#94a3b8";
			};
			const modRows = Object.entries(s.modules).map(([name, info]) => `<tr><td>${name}</td><td><code>${info?.id ?? "-"}</code></td><td>${info?.source ?? "-"}</td></tr>`).join("");
			const hookRows = Object.entries(s.hooks).map(([name, entry]) => `<tr><td>${name}</td><td><span class="dot" style="background:${badgeColor(entry.status)}"></span>${entry.status}</td><td>${entry.detail ?? ""}</td></tr>`).join("");
			const storyHtml = s.lastStory ? `<div><code>${s.lastStory.path}</code><br/>覆盖率：<b>${s.lastStory.matchedLines}/${s.lastStory.totalLines} (${s.lastStory.coveragePct}%)</b> · 译者：${s.lastStory.translator || "未知"}${s.lastStory.isAI ? " [AI]" : ""}</div>` : "<div class=\"muted\">尚未加载剧情</div>";
			const voiceInfo = this.actions?.getUntranslatedVoicesCsv?.() ?? {
				count: 0,
				csv: null
			};
			this.shadow.innerHTML = `
      <style>
        .card {
          width: 420px; max-height: 82vh; overflow-y: auto;
          background: rgba(15, 23, 42, 0.94); color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.35); border-radius: 10px;
          padding: 12px 14px; font: 12px/1.5 system-ui, -apple-system, sans-serif;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45); text-align: left;
        }
        .hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .title { font-weight: 700; font-size: 13px; color: #38bdf8; }
        .btns { display: flex; gap: 6px; flex-wrap: wrap; }
        button {
          background: #1e293b; color: #e2e8f0; border: 1px solid #475569;
          border-radius: 6px; padding: 3px 8px; cursor: pointer; font-size: 11px;
        }
        button:hover { background: #334155; }
        h4 { margin: 10px 0 4px; font-size: 11px; text-transform: uppercase; color: #94a3b8; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        td, th { padding: 3px 4px; border-bottom: 1px solid rgba(148, 163, 184, 0.16); }
        code { background: rgba(148, 163, 184, 0.16); padding: 1px 4px; border-radius: 4px; font-family: ui-monospace, monospace; }
        .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; }
        .muted { color: #94a3b8; }
      </style>
      <div class="card">
        <div class="hdr">
          <div class="title">${APP_NAME} v${s.version} 诊断面板</div>
          <div class="btns">
            <button id="btn-mt">机翻设置</button>
            <button id="btn-copy">复制报告</button>
            <button id="btn-voices">复制未翻语音(${voiceInfo.count})</button>
            <button id="btn-clear">清缓存</button>
            <button id="btn-close">关闭</button>
          </div>
        </div>
        <div class="muted">总开关：<b>${s.enabled ? "已启用" : "已暂停"}</b> · 主包：<code>${s.boot.require.appBundle ?? "未知"}</code></div>
        <h4>Boot 捕获</h4>
        <div>require: <b>${s.boot.require.captured ? "OK" : "FAIL"}</b> (${s.boot.require.method}, ${s.boot.require.elapsedMs}ms, chunk=<code>${s.boot.require.chunkVar ?? "-"}</code>)</div>
        <div>ezg: <b>${s.boot.ezg.captured ? "OK" : "FAIL"}</b> (${s.boot.ezg.method}, ${s.boot.ezg.elapsedMs}ms)</div>
        <h4>模块定位</h4>
        <table><tbody>${modRows || "<tr><td colspan=\"3\" class=\"muted\">等待定位...</td></tr>"}</tbody></table>
        <h4>Hook 状态</h4>
        <table><tbody>${hookRows}</tbody></table>
        <h4>数据层</h4>
        <div>源：<code>${s.data.source}</code> · 版本：<code>${s.data.version}</code> · 上游：<code>${s.data.upstreamCommit}</code></div>
        <h4>当前剧情覆盖率</h4>
        ${storyHtml}
        <h4>最近错误 (${s.errors.length})</h4>
        <div class="muted">${s.errors.slice(-3).map((e) => `[${e.scope}] ${e.message}`).join("<br/>") || "无"}</div>
      </div>
    `;
			this.shadow.getElementById("btn-close")?.addEventListener("click", () => this.hide());
			this.shadow.getElementById("btn-mt")?.addEventListener("click", () => {
				this.actions?.onOpenMtSettings?.();
			});
			this.shadow.getElementById("btn-copy")?.addEventListener("click", () => {
				const text = JSON.stringify(this.store.getSnapshot(), null, 2);
				navigator.clipboard?.writeText(text);
			});
			this.shadow.getElementById("btn-voices")?.addEventListener("click", () => {
				const latest = this.actions?.getUntranslatedVoicesCsv?.();
				if (latest?.csv) navigator.clipboard?.writeText(latest.csv);
			});
			this.shadow.getElementById("btn-clear")?.addEventListener("click", () => {
				this.actions?.onClearCache?.();
			});
		}
	};
	function pickLocalCsvFile() {
		return new Promise((resolve) => {
			if (typeof document === "undefined") {
				resolve(null);
				return;
			}
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".csv,text/csv";
			input.style.display = "none";
			input.addEventListener("change", async () => {
				const file = input.files?.[0];
				input.remove();
				if (!file) {
					resolve(null);
					return;
				}
				resolve(await file.text());
			});
			(document.body ?? document.documentElement).appendChild(input);
			input.click();
		});
	}
	function registerUserscriptMenus(actions) {
		if (typeof GM_registerMenuCommand !== "function") return;
		GM_registerMenuCommand(`打开 ${APP_NAME} v${APP_VERSION} 诊断面板`, () => {
			actions.panel.toggle();
		});
		if (actions.mtPanel) GM_registerMenuCommand("实时机翻设置（自定义 API / 免费保底）", () => {
			actions.mtPanel?.toggle();
		});
		GM_registerMenuCommand("切换汉化总开关（刷新后生效）", () => {
			const next = actions.onToggleEnabled();
			alert(`${APP_NAME} 汉化开关已切换为：${next ? "启用" : "停用"}，刷新页面后生效。`);
		});
		GM_registerMenuCommand("导出当前剧情原文 CSV", () => {
			const exported = actions.editor.exportLastStoryCsv();
			if (!exported) {
				showToast("当前尚未加载任何剧情，无法导出 CSV", { variant: "warn" });
				return;
			}
			triggerTextDownload(exported.filename, exported.content);
			showToast(`已导出：${exported.filename}`, { variant: "info" });
		});
		GM_registerMenuCommand("导入本地剧情 CSV 预览", async () => {
			const text = await pickLocalCsvFile();
			if (!text) return;
			const parsed = actions.editor.setPreviewCsv(text);
			if (!parsed) {
				showToast("CSV 缺少有效 info 行，无法绑定剧情路径", { variant: "warn" });
				return;
			}
			showToast(`已载入本地预览（${parsed.infoPath}），重新进入剧情生效`, { variant: "info" });
		});
		GM_registerMenuCommand("导出本次未翻译剧情清单", () => {
			const bundle = actions.editor.exportUntranslatedBundle();
			const count = Object.keys(bundle).length;
			if (count === 0) {
				showToast("本次会话暂未记录到未翻译剧情", { variant: "info" });
				return;
			}
			triggerTextDownload(`sczh-untranslated-${Date.now()}.json`, JSON.stringify(bundle, null, 2) + "\n", "application/json;charset=utf-8");
			showToast(`已导出 ${count} 篇未翻译剧情原文包`, { variant: "info" });
		});
		GM_registerMenuCommand("导出未翻译语音/短句 CSV", () => {
			const csv = actions.editor.exportUntranslatedVoicesCsv();
			const count = actions.editor.getUntranslatedVoiceCount();
			if (!csv || count === 0) {
				showToast("本次会话暂未记录到未翻译主页/培育语音", { variant: "info" });
				return;
			}
			triggerTextDownload(`sczh-untranslated-voices-${Date.now()}.csv`, csv);
			showToast(`已导出 ${count} 条未翻译语音 CSV`, { variant: "info" });
		});
		GM_registerMenuCommand("设置自定义数据源 URL", () => {
			const current = readCustomSource() ?? "";
			const next = prompt("输入自定义数据源根 URL（例如 http://127.0.0.1:8787/），留空则恢复默认 GitHub Pages / jsDelivr 源：", current);
			if (next === null) return;
			writeCustomSource(next);
			alert(next.trim() ? `自定义源已设为：${next.trim()}，请刷新页面生效。` : "已清除自定义源，恢复默认源，请刷新页面生效。");
		});
		GM_registerMenuCommand("清空本地翻译缓存", async () => {
			await actions.onClearCache();
			showToast("本地翻译缓存已清空", { variant: "info" });
		});
	}
	function escapeAttr(val) {
		return val.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}
	var TranslateSettingsPanel = class {
		translator;
		host = null;
		shadow = null;
		visible = false;
		constructor(translator) {
			this.translator = translator;
		}
		toggle() {
			if (this.visible) this.hide();
			else this.show();
		}
		show() {
			if (typeof document === "undefined") return;
			if (!this.host) this.mount();
			this.visible = true;
			if (this.host) this.host.style.display = "block";
			this.render();
		}
		hide() {
			this.visible = false;
			if (this.host) this.host.style.display = "none";
		}
		destroy() {
			this.host?.remove();
			this.host = null;
			this.shadow = null;
		}
		mount() {
			const host = document.createElement("div");
			host.id = "sczh-mt-settings-host";
			host.style.position = "fixed";
			host.style.top = "20px";
			host.style.left = "50%";
			host.style.transform = "translateX(-50%)";
			host.style.zIndex = "2147483647";
			host.style.display = "none";
			const shadow = host.attachShadow({ mode: "open" });
			(document.body ?? document.documentElement).appendChild(host);
			this.host = host;
			this.shadow = shadow;
		}
		render() {
			if (!this.shadow) return;
			const cfg = this.translator.getConfig();
			const currentPreset = getMtPreset(cfg.provider);
			const presetOptions = MT_PRESETS.map((p) => `<option value="${p.id}" ${p.id === cfg.provider ? "selected" : ""}>${escapeAttr(p.label)}</option>`).join("");
			this.shadow.innerHTML = `
      <style>
        .card {
          width: 460px; max-width: 92vw; max-height: 86vh; overflow-y: auto;
          background: rgba(15, 23, 42, 0.96); color: #e2e8f0;
          border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 12px;
          padding: 14px 16px; font: 12px/1.5 system-ui, -apple-system, sans-serif;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55); text-align: left;
        }
        .hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .title { font-weight: 700; font-size: 14px; color: #38bdf8; }
        .note { background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.28); border-radius: 8px; padding: 8px 10px; font-size: 11px; color: #bae6fd; margin-bottom: 10px; }
        .row { margin-bottom: 9px; }
        .row label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 3px; }
        .checks { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
        .chk { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #f1f5f9; cursor: pointer; }
        input[type="text"], input[type="password"], input[type="number"], select, textarea {
          width: 100%; box-sizing: border-box; background: #0f172a; color: #f8fafc;
          border: 1px solid #334155; border-radius: 6px; padding: 6px 8px;
          font: 12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace;
        }
        textarea { min-height: 52px; resize: vertical; font-family: system-ui, sans-serif; }
        .hint { font-size: 11px; color: #94a3b8; margin-top: 4px; }
        .key-wrap { display: flex; gap: 6px; }
        .key-wrap input { flex: 1; }
        .btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        button {
          background: #1e293b; color: #e2e8f0; border: 1px solid #475569;
          border-radius: 6px; padding: 6px 11px; cursor: pointer; font-size: 12px;
        }
        button:hover { background: #334155; }
        button.primary { background: #0284c7; border-color: #0ea5e9; color: #fff; font-weight: 600; }
        button.primary:hover { background: #0369a1; }
        .status { margin-top: 10px; padding: 8px 10px; border-radius: 6px; font-size: 11px; display: none; word-break: break-all; }
        .status.ok { display: block; background: rgba(34, 197, 94, 0.14); border: 1px solid rgba(34, 197, 94, 0.4); color: #bbf7d0; }
        .status.err { display: block; background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.4); color: #fecaca; }
        .status.info { display: block; background: rgba(148, 163, 184, 0.14); border: 1px solid rgba(148, 163, 184, 0.35); color: #e2e8f0; }
      </style>
      <div class="card">
        <div class="hdr">
          <div class="title">${APP_NAME} · 实时机翻设置</div>
          <button id="mt-close">关闭</button>
        </div>
        <div class="note">
          严格优先级：<b>社区人工 &gt; 本地人工 &gt; 离线 AI &gt; 实时机翻</b>。所有 API Key 仅保存在本机浏览器 localStorage，绝不上传；机翻结果自动缓存于 IndexedDB，重看零延迟。
        </div>
        <div class="checks">
          <label class="chk"><input type="checkbox" id="mt-enabled" ${cfg.enabled ? "checked" : ""} /> 启用实时机翻</label>
          <label class="chk"><input type="checkbox" id="mt-fallback" ${cfg.fallbackToFree ? "checked" : ""} /> 失败/无Key时自动免费保底</label>
          <label class="chk"><input type="checkbox" id="mt-stories" ${cfg.translateStories ? "checked" : ""} /> 未翻译剧情自动机翻</label>
          <label class="chk"><input type="checkbox" id="mt-voices" ${cfg.translateVoices ? "checked" : ""} /> 未翻译语音气泡自动机翻</label>
        </div>
        <div class="row">
          <label for="mt-provider">翻译引擎预设</label>
          <select id="mt-provider">${presetOptions}</select>
          <div class="hint" id="mt-hint">${escapeAttr(currentPreset.hint)}</div>
        </div>
        <div class="row">
          <label for="mt-url">API 接口地址（Endpoint）</label>
          <input type="text" id="mt-url" value="${escapeAttr(cfg.baseUrl)}" />
        </div>
        <div class="row">
          <label for="mt-model">模型名称（Model）</label>
          <input type="text" id="mt-model" value="${escapeAttr(cfg.model)}" />
        </div>
        <div class="row">
          <label for="mt-key">API Key / Token（免费保底与本地 Ollama 可留空）</label>
          <div class="key-wrap">
            <input type="password" id="mt-key" value="${escapeAttr(cfg.apiKey)}" placeholder="sk-... / AIza... / Token" />
            <button type="button" id="mt-toggle-key">显示</button>
          </div>
        </div>
        <div class="row">
          <label for="mt-prompt">自定义系统提示词（留空则使用内置 283 事务所术语提示词）</label>
          <textarea id="mt-prompt" placeholder="留空即可获得内置 283 角色译名与口癖提示词">${escapeAttr(cfg.customPrompt)}</textarea>
        </div>
        <div class="btns">
          <button class="primary" id="mt-save">保存设置</button>
          <button id="mt-test">测试连接</button>
          <button id="mt-clear-cache">清空机翻缓存</button>
        </div>
        <div class="status" id="mt-status"></div>
      </div>
    `;
			const q = (id) => this.shadow.getElementById(id);
			const providerEl = q("mt-provider");
			const urlEl = q("mt-url");
			const modelEl = q("mt-model");
			const keyEl = q("mt-key");
			const hintEl = q("mt-hint");
			const promptEl = q("mt-prompt");
			const statusEl = q("mt-status");
			const readForm = () => ({
				enabled: q("mt-enabled").checked,
				fallbackToFree: q("mt-fallback").checked,
				translateStories: q("mt-stories").checked,
				translateVoices: q("mt-voices").checked,
				provider: providerEl.value,
				baseUrl: urlEl.value.trim() || getMtPreset(providerEl.value).defaultBaseUrl,
				model: modelEl.value.trim() || getMtPreset(providerEl.value).defaultModel,
				apiKey: keyEl.value.trim(),
				timeoutMs: cfg.timeoutMs,
				customPrompt: promptEl.value
			});
			const setStatus = (cls, msg) => {
				statusEl.className = `status ${cls}`;
				statusEl.textContent = msg;
			};
			providerEl.addEventListener("change", () => {
				const preset = getMtPreset(providerEl.value);
				urlEl.value = preset.defaultBaseUrl;
				modelEl.value = preset.defaultModel;
				hintEl.textContent = preset.hint;
			});
			q("mt-toggle-key").addEventListener("click", (ev) => {
				const btn = ev.currentTarget;
				if (keyEl.type === "password") {
					keyEl.type = "text";
					btn.textContent = "隐藏";
				} else {
					keyEl.type = "password";
					btn.textContent = "显示";
				}
			});
			q("mt-close").addEventListener("click", () => this.hide());
			q("mt-save").addEventListener("click", () => {
				const next = readForm();
				this.translator.updateConfig(next);
				setStatus("ok", `已保存：${getMtPreset(next.provider).label}（请先点「测试连接」验证连通性；如已在剧情中，退出重新进入即可生效）`);
				showToast("实时机翻设置已保存", { variant: "info" });
			});
			q("mt-test").addEventListener("click", async () => {
				const next = readForm();
				this.translator.updateConfig(next);
				setStatus("info", "正在发送测试台词，请稍候...");
				const res = await this.translator.testConnection();
				if (res.ok) {
					const tag = res.usedFallback ? "（已自动降级至免费保底）" : "";
					setStatus("ok", `连接成功 [${res.engineLabel}]${tag} · ${res.elapsedMs}ms\n示例译文：${res.sampleOutput}`);
				} else setStatus("err", `测试失败 (${res.elapsedMs}ms)：${res.error}`);
			});
			q("mt-clear-cache").addEventListener("click", async () => {
				await this.translator.clearCache();
				setStatus("ok", "已清空所有本地机翻缓存，重新进入剧情将重新翻译。");
				showToast("机翻缓存已清空", { variant: "info" });
			});
		}
	};
	var ENABLED_STORAGE_KEY = "sczh:enabled";
	function readEnabledFlag() {
		try {
			return localStorage.getItem(ENABLED_STORAGE_KEY) !== "off";
		} catch {
			return true;
		}
	}
	function toggleEnabledFlag() {
		const next = !readEnabledFlag();
		try {
			localStorage.setItem(ENABLED_STORAGE_KEY, next ? "on" : "off");
		} catch {}
		return next;
	}
	async function bootstrap() {
		const readyState = typeof document !== "undefined" ? document.readyState : "unknown";
		const href = typeof location !== "undefined" ? location.href : "unknown";
		const enabled = readEnabledFlag();
		console.info(`[${APP_NAME}] v${APP_VERSION} loaded (enabled=${enabled}, readyState=${readyState}, url=${href})`);
		const repo = new DataRepository();
		const diag = new DiagnosticsStore();
		const editor = new StoryEditorStore();
		const translator = new RuntimeTranslator();
		const mtPanel = new TranslateSettingsPanel(translator);
		diag.setEnabled(enabled);
		registerUserscriptMenus({
			panel: new DiagnosticsPanel(diag, {
				onClearCache: () => repo.clearCache(),
				onToggleEnabled: () => {
					const next = toggleEnabledFlag();
					diag.setEnabled(next);
				},
				onOpenMtSettings: () => mtPanel.toggle(),
				getUntranslatedVoicesCsv: () => ({
					count: editor.getUntranslatedVoiceCount(),
					csv: editor.exportUntranslatedVoicesCsv()
				})
			}),
			mtPanel,
			editor,
			onToggleEnabled: () => {
				const next = toggleEnabledFlag();
				diag.setEnabled(next);
				return next;
			},
			onClearCache: () => repo.clearCache()
		});
		if (!enabled) return;
		const ezgHandle = installEzgCapture({ timeoutMs: 3e4 });
		const reqHandle = installRequireCapture({ timeoutMs: 3e4 });
		const manifestPromise = repo.getManifest().then((loaded) => {
			diag.setDataInfo({
				source: loaded.source,
				version: loaded.manifest.version,
				upstreamCommit: loaded.manifest.upstreamCommit.slice(0, 8)
			});
			return loaded;
		}).catch((err) => {
			diag.recordError("manifest", err);
			diag.setDataInfo({ source: "加载失败（降级）" });
			return null;
		});
		installApiHook({
			modules: {},
			repo,
			diag,
			editor,
			translator
		});
		const [reqRes, loadedManifest] = await Promise.all([reqHandle.promise, manifestPromise]);
		const capturedEzg = ezgHandle.getCurrent();
		ezgHandle.cleanup();
		diag.setRequireBoot(reqRes);
		const modules = locateAllModules(reqRes.require, {
			appBundle: reqRes.appBundle,
			ezgFallback: capturedEzg,
			extraHints: loadedManifest?.manifest.moduleHints
		});
		diag.setEzgBoot({
			ezg: capturedEzg ?? modules.AOBA?.value ?? null,
			method: capturedEzg ? "defineProperty" : modules.AOBA?.value ? "existing" : "timeout",
			elapsedMs: reqRes.elapsedMs
		});
		diag.setModules(modules);
		const hookCtx = {
			modules,
			repo,
			diag,
			editor,
			translator
		};
		installStoryHook(hookCtx);
		await Promise.allSettled([
			installPhraseHook(hookCtx),
			installTextHook(hookCtx),
			installFontHook(hookCtx),
			installResourceHook(hookCtx)
		]);
		console.info(`[${APP_NAME}] Ready:`, diag.getSnapshot().hooks);
	}
	bootstrap();
})();
