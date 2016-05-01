package main 

import (
	"crypto/tls"
	"crypto/x509"
	"flag"
	"io"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"fmt"
)

func msg() {
	fmt.Printf("You must specified starting mode !\n")
}

type ConsulHandler struct {
	path string
}

func (h *ConsulHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := net.Dial("tcp", h.path)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		return
	}
	c := httputil.NewClientConn(conn, nil)
	defer c.Close()

	res, err := c.Do(r)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		return
	}
	defer res.Body.Close()

	copyHeader(w.Header(), res.Header)
	if _, err := io.Copy(w, res.Body); err != nil {
		log.Println(err)
	}
}

func copyHeader(dst, src http.Header) {
	for k, vv := range src {
		for _, v := range vv {
			dst.Add(k, v)
		}
	}
}

func createTcpHandler(e string) http.Handler {
	u, err := url.Parse(e)
	if err != nil {
		log.Fatal(err)
	}
	return httputil.NewSingleHostReverseProxy(u)
}

func swarmui(consulAddr string, DockerEndpoint string, RepoEndpoint string, addr string, dir string) {
	handler := createHandler(dir, consulAddr, DockerEndpoint, RepoEndpoint)
	go func() {
		if err := http.ListenAndServe(addr, handler); err != nil {
			log.Println(handler)
			log.Fatal(err)
		}
	}()
}

func createHandler(dir string, consulAddr string, DockerEndpoint string, RepoEndpoint string) http.Handler {
	var (
		mux         = http.NewServeMux()
		fileHandler = http.FileServer(http.Dir(dir))
		dockerHandler http.Handler
		dockerHandlerRepo http.Handler
		h           http.Handler
	)

	DockerEndpoint = "http://" + DockerEndpoint
	RepoEndpoint = "http://" + RepoEndpoint

	h = createTcpHandler(consulAddr)
	dockerHandler = createTcpHandler(DockerEndpoint)
	dockerHandlerRepo = createTcpHandler(RepoEndpoint)

	mux.Handle("/consulapi/", http.StripPrefix("/consulapi", h))
	mux.Handle("/swarmuiapi/", http.StripPrefix("/swarmuiapi", dockerHandler))
	mux.Handle("/swarmuiapirepo/", http.StripPrefix("/swarmuiapirepo", dockerHandlerRepo))
	mux.Handle("/", fileHandler)
	return mux
}

func sendHttp(w http.ResponseWriter, r *http.Request, client *http.Client) {

    req, err := http.NewRequest(r.Method, "http:/" + r.URL.Path + "?" + r.URL.RawQuery, r.Body)
    if err != nil {
        log.Println(err)
    }       
    req.Header.Set("X-Custom-Header", "myvalue")
    req.Header.Set("Content-Type", "application/json")
        resp, err := client.Do(req)
        if err != nil {
            log.Println(err)
        }       
    defer resp.Body.Close()

    copyHeader(w.Header(), resp.Header)
    if _, err := io.Copy(w, resp.Body); err != nil {
        log.Println(err)
    }
}

func sendHttps(w http.ResponseWriter, r *http.Request, client *http.Client) {
    req, err := http.NewRequest(r.Method, "https:/" + r.URL.Path + "?" + r.URL.RawQuery, r.Body)
    if err != nil {
        log.Println(err)
    }       
    req.Header.Set("X-Custom-Header", "myvalue")
    req.Header.Set("Content-Type", "application/json")

    resp, err := client.Do(req)
    if err != nil {
        log.Println(err)
    }       
    defer resp.Body.Close()

    copyHeader(w.Header(), resp.Header)
    if _, err := io.Copy(w, resp.Body); err != nil {
        log.Println(err)
    }
}

func docker(DockerEndpoint string) {
    tr := &http.Transport{
        DisableCompression: true,
        DisableKeepAlives: false,
    }
    client := &http.Client{Transport: tr}

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        sendHttp(w, r, client)
    })
    go func() {
    	log.Fatal(http.ListenAndServe(DockerEndpoint, nil))
    }()
}


func dockerRepo(RepoEndpoint string, myProxy string) {
	repo := http.NewServeMux()
	if myProxy != "" {
	    url_i := url.URL{}
	    url_proxy, _ := url_i.Parse(myProxy)

	    tr := &http.Transport{
	      DisableCompression: false,
	      DisableKeepAlives: false,
	      Proxy: http.ProxyURL(url_proxy),
	      TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	    }
	    clientRepo := &http.Client{Transport: tr}
	    
	    repo.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
	      	sendHttps(w, r, clientRepo)
	  	})
		log.Fatal(http.ListenAndServe(RepoEndpoint, repo))
	} else {
		tr := &http.Transport{
	      DisableCompression: false,
	      DisableKeepAlives: false,
	      TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	    }
	    clientRepo := &http.Client{Transport: tr}

		repo.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
	    	sendHttps(w, r, clientRepo)
	  	})
		log.Fatal(http.ListenAndServe(RepoEndpoint, repo))
	}
}

func dockerTls(DockerEndpoint string, certFile string, keyFile string, caFile string) {
    // Load client cert
    cert, err := tls.LoadX509KeyPair(certFile, keyFile)
    if err != nil {
        log.Fatal(err)
    }

    // Load CA cert
    caCert, err := ioutil.ReadFile(caFile)
    if err != nil {
        log.Fatal(err)
    }
    caCertPool := x509.NewCertPool()
    caCertPool.AppendCertsFromPEM(caCert)

    // Setup HTTPS client
    tlsConfig := &tls.Config{
        Certificates: []tls.Certificate{cert},
        RootCAs:      caCertPool,
    }
    tlsConfig.BuildNameToCertificate()

    tr := &http.Transport{
        DisableCompression: false,
        DisableKeepAlives: false,
        TLSClientConfig: tlsConfig,
    }
    client := &http.Client{Transport: tr}

    tls := http.NewServeMux()

    tls.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        sendHttps(w, r, client)
    })
    go func() {
    	log.Fatal(http.ListenAndServe(DockerEndpoint, tls))
    }()

}

func main() {

	var (
		consulAddr  = flag.String("consul", "","Consul Server url. (Exemple http://localhost:8500)")
		DockerEndpoint = flag.String("DockerEndpoint", "localhost:9001", "Access to Dockers services")
		RepoEndpoint = flag.String("RepoEndpoint", "localhost:9002", "Access to Dockers REPO")
		tls 	  = flag.Bool("tls", false, "Docker is in TLS mode")
		addr      = flag.String("p", ":9000", "Address and port to serve swarmui")
		assets    = flag.String("a", ".", "Path to the assets")
		certFile  = flag.String("cert", "certs/cert.pem", "A PEM encoded certificate file.")
        keyFile   = flag.String("key", "certs/key.pem", "A PEM encoded private key file.")
        caFile    = flag.String("CA", "certs/ca.pem", "A PEM encoded CA's certificate file.")
        myProxy	  = flag.String("proxy", "", "Http PROXY information")
	)

	flag.Parse()

	if *consulAddr == "" {
		fmt.Fprintf(os.Stderr, "Consul Server URL unset !\n")
		fmt.Fprintf(os.Stderr, "Use flag: -consul <consul url>\n")
		fmt.Fprintf(os.Stderr, "\tExemple: -consul http://localhost:8500\n")
		os.Exit(1)
	}

	fmt.Printf("Starting swarmui server\n")
	swarmui(*consulAddr, *DockerEndpoint, *RepoEndpoint, *addr, *assets)
	if *tls == true {
		fmt.Printf("Starting Dockers Tls endpoint\n")
		dockerTls(*DockerEndpoint, *certFile, *keyFile, *caFile)
	} else {
		fmt.Printf("Starting Dockers endpoint\n")
		docker(*DockerEndpoint)
	}
	fmt.Printf("Starting Dockers Repo endpoint\n")
	dockerRepo(*RepoEndpoint, *myProxy)

}
