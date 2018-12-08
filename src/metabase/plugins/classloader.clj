(ns metabase.plugins.classloader
  (:require [clojure.tools.logging :as log]
            [dynapath.util :as dynapath]
            [metabase.util :as u]
            [metabase.util.i18n :refer [trs]])
  (:import [clojure.lang DynamicClassLoader RT]
           java.net.URL))

(defonce ^:private added-urls (atom #{}))

(defn- new-classloader ^DynamicClassLoader [^ClassLoader parent]
  (u/prog1 (DynamicClassLoader. parent)
    (doseq [url @added-urls]
      (assert (dynapath/add-classpath-url <> url)))))


(defn ^DynamicClassLoader the-classloader
  "Fetch the context classloader for the current thread; ensure it's an instance of DynamicClassLoader, creating a new
  one and setting it if needed.

  This function should be used when loading classes (such as JDBC drivers) with `Class/forName`; and for side-effects
  before calling `require`, to ensure the context classloader for the current thread is one that has access to the JARs
  we've added to the classpath."
  []
  (let [current-context-classloader (.getContextClassLoader (Thread/currentThread))]
    (cond
      ;; if context classloader is already a DynamicClassLoader return as-is
      (instance? DynamicClassLoader current-context-classloader)
      current-context-classloader

      ;; Otherwise try using RT/baseLoader; this is the method ulimately called by `require` to get the ClassLoader
      ;; used for loading namespaces. We can go ahead and use this as the context classloader so when adding a JAR URL
      ;; to it `Class/forName` will be able to find Java classes and `require` will be able to find our Clojure
      ;; namespaces
      (instance? DynamicClassLoader (RT/baseLoader))
      (do
        (.setContextClassLoader (Thread/currentThread) (RT/baseLoader))
        (RT/baseLoader))

      ;; Otherwise go a head and create a new DynamicClassLoader using the current contextClassLoader as its parent
      ;; and add our URLs to it
      :else
      (u/prog1 (new-classloader current-context-classloader)
        (.setContextClassLoader (Thread/currentThread) <>)))))


(defn- the-top-level-classloader
  "Find the highest-level DynamicClassLoader, starting our search with the current thread's context classloader (set, if
  needed, by `classloader` above), and recursing thru each parent. This calls `the-classloader`, which as a
  side-effect will make the current thread's context classloader a DynamicClassloader if it is not one already.

  Why? We want to add our JAR URLs to the highest-level classloader to maximize the chance "
  (^DynamicClassLoader []
   (the-top-level-classloader (the-classloader)))
  (^DynamicClassLoader [^DynamicClassLoader classloader]
   (let [parent (.getParent classloader)]
     (if (instance? DynamicClassLoader parent)
       (recur parent)
       classloader))))

(defn add-url-to-classpath!
  "Add a URL (presumably for a local JAR) to the classpath."
  [^URL url]
  ;; `add-classpath-url` will return non-truthy if it couldn't add the URL, e.g. because the classloader wasn't one
  ;; that allowed it
  (assert (dynapath/add-classpath-url (the-top-level-classloader) url))
  ;; ok, now save this URL so we can add it to any new classloaders we have to create
  (swap! added-urls conj url)
  (log/info (u/format-color 'blue (trs "Added {0} to classpath" url))))
