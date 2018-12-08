(ns metabase.plugins
  (:require [clojure.string :as str]
            [clojure.tools.logging :as log]
            [environ.core :as env]
            [metabase.plugins
             [classloader :as classloader]
             [files :as files]
             [initialize :as init]
             [lazy-loaded-driver :as lazy-loaded-driver]]
            [metabase.util :as u]
            [metabase.util.i18n :refer [trs]]
            [yaml.core :as yaml])
  (:import java.nio.file.Path))

(defn- plugins-dir-filename ^String []
  (or (env/env :mb-plugins-dir)
      (str (System/getProperty "user.dir") "/plugins")))

(defn- ^Path plugins-dir
  "Get a `Path` to the Metabase plugins directory, creating it if needed."
  []
  (let [path (files/get-path (plugins-dir-filename))]
    (files/create-dir-if-not-exists! path)
    path))

(defn- extract-system-modules! []
  (let [plugins-path (plugins-dir)]
    (files/with-open-path-to-resource [modules-path "modules"]
      (files/copy-files-if-not-exists! modules-path plugins-path))))


;;; +----------------------------------------------------------------------------------------------------------------+
;;; |                                               Initialize Plugin                                                |
;;; +----------------------------------------------------------------------------------------------------------------+

(defn- add-to-classpath! [^Path jar-path]
  (classloader/add-url-to-classpath! (-> jar-path .toUri .toURL)))

(defn- plugin-info [^Path jar-path]
  (some-> (files/slurp-file-from-archive jar-path "metabase-plugin.yaml")
          yaml/parse-string))

(defn- init-plugin! [^Path jar-path]
  (when-let [{init-steps :init, {:keys [delay-loading]} :driver, :as info} (plugin-info jar-path)]
    (if delay-loading
      ;; TODO - if we're delaying loading we should wait until loading to add the driver to the Classpath!!!
      (lazy-loaded-driver/register-lazy-loaded-driver! info)
      (init/initialize! init-steps))))


;;; +----------------------------------------------------------------------------------------------------------------+
;;; |                                                 load-plugins!                                                  |
;;; +----------------------------------------------------------------------------------------------------------------+

(defn- plugins-paths []
  (for [^Path path (files/files-seq (plugins-dir))
        :when      (and (files/regular-file? path)
                        (files/readable? path)
                        (str/ends-with? (.getFileName path) ".jar"))]
    path))

(defn- add-plugins-to-classpath! [paths]
  (doseq [path paths]
    (add-to-classpath! path)))

(defn- init-plugins! [paths]
  (doseq [path paths]
    (init-plugin! path)))

(defn load-plugins!
  "Load Metabase plugins. The are JARs shipped as part of Metabase itself, under the `resources/modules` directory (the
  source for these JARs is under the `modules` directory); and others manually added by users to the Metabase plugins
  directory, which defaults to `./plugins`.

  When loading plugins, Metabase performs the following steps:

  *  Metabase creates the plugins directory if it does not already exist.
  *  Any plugins that are shipped as part of Metabase itself are extracted from the Metabase uberjar (or `resources`
     directory when running with `lein`) into the plugins directory.
  *  Each JAR in the plugins directory is added to the classpath.
  *  For JARs that include a Metabase plugin manifest (a `metabase-plugin.yaml` file), "
  []
  (log/info (u/format-color 'magenta (trs "Loading plugins in {0}..." (str (plugins-dir)))))
  (extract-system-modules!)
  (let [paths (plugins-paths)]
    (add-plugins-to-classpath! paths)
    (init-plugins! paths)))
