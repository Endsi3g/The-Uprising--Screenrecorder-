export type PerformanceMode = "low" | "balanced" | "high" | "auto";

export function getSystemCapabilities(): "low" | "balanced" | "high" {
	if (typeof navigator !== "undefined") {
		// deviceMemory returns memory in GB (approx)
		const memory = (navigator as any).deviceMemory || 8;
		const cores = navigator.hardwareConcurrency || 4;

		if (memory <= 4 || cores <= 4) {
			return "low";
		} else if (memory >= 16 && cores >= 8) {
			return "high";
		}
		return "balanced";
	}
	return "balanced";
}

export function getPerformanceMode(): "low" | "balanced" | "high" {
	try {
		const storedPref = localStorage.getItem("openscreen-perf-mode") as PerformanceMode;
		if (storedPref && ["low", "balanced", "high"].includes(storedPref)) {
			return storedPref as "low" | "balanced" | "high";
		}
	} catch (e) {
		// localStorage might not be available
	}
	return getSystemCapabilities();
}
