import Amplify, {API, Auth, Storage} from "aws-amplify";
import React, {Component} from "react";
import axios from "axios";

import {AWSCongitoAuth, AWSCongitoS3Storage, AWSRegion, CUSTOM_AUTH_SERVER_URL} from "../config";

Amplify.configure({
  Auth: AWSCongitoAuth,
  Storage: {
    AWSS3: AWSCongitoS3Storage,
  }
});


class App extends Component {
  state = {
    username: "",
    password: "",
    email: "",
    phone: "",
    user: undefined,

    // List of files
    publicFiles: undefined,
    protectedFiles: undefined,
    protectedOtherFiles: undefined,
    privateFiles: undefined,
    identityIdForProtectedList: undefined,
    publicImageURLs: {},
    // Current file

    // public
    publicImageKey: undefined,
    publicImageUrl: undefined,

    // protected
    protectedImageKey: undefined,
    protectedImageUrl: undefined,

    // private
    privateImageKey: undefined,
    privateImageUrl: undefined,
  }

  componentDidMount = () => {
    console.log(AWSCongitoAuth);
    this.showCurrentUser();
  }

  clearState = () => {
    this.setState({
      user: undefined,
      // List of files
      publicFiles: undefined,
      protectedFiles: undefined,
      protectedOtherFiles: undefined,
      privateFiles: undefined,
      identityIdForProtectedList: undefined,
      publicImageURLs: {},

      // Current file

      // public
      publicImageKey: undefined,
      publicImageUrl: undefined,

      // protected
      protectedImageKey: undefined,
      protectedImageUrl: undefined,

      // private
      privateImageKey: undefined,
      privateImageUrl: undefined,
    });
  }

  handleUsernameChange = (event) => {
    this.setState({username: event.target.value});
  }

  handlePasswordChange = (event) => {
    this.setState({password: event.target.value});
  }

  handleEmailChange = (event) => {
    this.setState({email: event.target.value});
  }

  handlePhoneNumberChange = (event) => {
    this.setState({phone: event.target.value});
  }

  onSignIn = () => {
    console.log("Starting sign in...");
    const {username, password} = this.state;
    Auth.signIn(username, password)
      .then(user => {
        console.log("User signed in successfully", user);
        this.setState({user});
      })
      .catch(err => {
        console.log("Error during sign in", err);
      });
    console.log(Auth);
  }

  onSignUp = () => {
    console.log("Starting sign up...");
    const {username, password, email, phone} = this.state;
    Auth.signUp({
      username,
      password,
      attributes: {
        email,          // optional
        phone_number: phone,   // optional - E.164 number convention
        // other custom attributes
      },
      validationData: []  //optional
    })
      .then(data => {
        console.log("User signed up successfully", data);
        console.log(data);
        // TODO: add a form to submit the confirmation code
        this.setState({user: data.user});
      })
      .catch(err => {
        console.log("Error during sign out", err);
      });
  }

  onSignOut = () => {
    console.log("Starting sign out...");
    Auth.signOut()
      .then(data => {
        console.log("User signed out successfully", data);
        this.setState({user: undefined});
      })
      .catch(err => {
        console.log("Error during sign out", err);
      });
  }

  customAuth = (authData) => {
    console.log("Starting custom auth request...", authData);
    axios.post(`${CUSTOM_AUTH_SERVER_URL}/auth`, authData)
      .then(response => {
        console.log("User signed in successfully with custom service", response);
        console.log("Local token", response.data.local_token);
        // this.localStorage.set("localToken", response.data.local_token);

        Auth.federatedSignIn(
          "developer",
          {
            token: response.data.cognito.Token,
            identity_id: response.data.cognito.IdentityId,
          },
          {username: response.data.user.username},
        )
          .then(credentials => {
            console.log("Got aws credentials", credentials);
            this.clearState();
            this.setState({
              user: {
                id: credentials.data.IdentityId,
                username: response.data.user.username,
              },
            });
          }).catch(e => {
            console.log("Error during acquiring AWS credentials", e);
          });
      })
      .catch(err => {
        console.log("Error during custom signing in", err);
      });
  }

  onCustomSignIn = () => {
    console.log("Starting custom sign in...");
    const {username, password} = this.state;
    return this.customAuth({username, password});
  }

  refreshAuth = () => {
    console.log("Starting custom refresh...");
    // const localToken = this.localStorage.get("localToken");
    return this.customAuth({token: localToken});
  }

  onCustomSignOut = () => {
    console.log("Starting custom sign out...");
    Auth.signOut()
      .then(data => {
        console.log("User signed out successfully", data);
        this.clearState();
      })
      .catch(err => {
        console.log("Error during sign out", err);
      });
  }

  showCurrentUser = () => {
    console.log("Trying to fetch current user...");
    Auth.currentCredentials()
      .then(credentials => {
        console.log("=== Got credentials ===");
        console.log(credentials);
        console.log(credentials.expired);
        console.log("=======================");
        if (!credentials.expired) {
          Auth.currentAuthenticatedUser()
            .then(user => {
              console.log("Current user is", user);
              console.log("Start checking the credentials...");
              this.setState({user});
            })
            .catch(e => {
              console.log("=== Can't get current user ===");
              console.log(e);
              // this.refreshAuth();  # TODO: check
            });
        }
      })
      .catch(e => {
        console.log("=== Session is not valid ===");
        console.log(e);
        // this.refreshAuth();
      });
  }

  onImageUpload = (event, level, prefix) => {
    console.log("onImageUpload", level, event);
    const file = event.target.files[0];
    console.log(file.name);
    Storage
      .put(`${prefix}/${file.name}`, file, {
        level,
        contentType: "image/png",
      })
      .then (result => {
        console.log(result);
      })
      .catch(err => {
        console.log(err);
      });
  }

  onImageUploadPublic = (event) => {
    console.log("onImageUploadPublic", event);
    return this.onImageUpload(event, "public", "photos");
  }

  onImageUploadProtected = (event) => {
    return this.onImageUpload(event, "protected", "photos");
  }

  onImageUploadPrivate = (event) => {
    return this.onImageUpload(event, "private", "photos");
  }

  getFileList = (level, prefix, identityId) => {
    const logParams = `(prefix=${prefix}, level=${level}, identityId=${identityId})`;
    console.log(`Storage.list ${logParams}`);
    return Storage.list(prefix, {level, identityId})
      .then(result => {
        console.log(`Got result from list ${logParams}: `, result);
        return result;
      })
      .catch(e => {
        console.log(`Error during Storage.list ${logParams}`, e);
        throw e;  // https://bugs.chromium.org/p/chromium/issues/detail?id=60240
      });
  }

  onPublicFilesReload = () => {
    this.getFileList("public", "photos")
      .then(result => {
        this.setState({publicFiles: result});
      });
  }

  onProtectedFilesReload = () => {
    this.getFileList("protected", "photos")
      .then(result => {
        this.setState({protectedFiles: result});
      });
  }

  onOtherProtectedFilesReload = () => {
    this.getFileList("protected", "photos", this.state.identityIdForProtectedList)
      .then(result => {
        this.setState({protectedOtherFiles: result});
      });
  }

  onPrivateFilesReload = () => {
    this.getFileList("private", "photos")
      .then(result => {
        this.setState({privateFiles: result});
      });
  }

  handleProtectedIdChanged = (event) => {
    this.setState({identityIdForProtectedList: event.target.value});
  }

  handlePublicImageKeyChanged = (event) => {
    this.setState({publicImageKey: event.target.value});
  }


  handleProtectedImageKeyChanged = (event) => {
    this.setState({protectedImageKey: event.target.value});
  }

  handlePrivateImageKeyChanged = (event) => {
    this.setState({privateImageKey: event.target.value});
  }

  onShowPublicImage = () => {
    const {publicImageKey} = this.state;
    console.log(`Start retrieving public image url for ${publicImageKey}`);
    Storage.get(publicImageKey)
      .then(result => {
        console.log("Got result for public image URL: ", result);
        this.setState({publicImageUrl: result});
      });
  }

  onShowProtectedImage = () => {
    const {protectedImageKey} = this.state;
    console.log(`Start retrieving protected image url for ${protectedImageKey}`);
    Storage.get(protectedImageKey, {"level": "protected"})
      .then(result => {
        console.log("Got result for protected image URL: ", result);
        this.setState({protectedImageUrl: result});
      });
  }

  onShowPrivateImage = () => {
    const {privateImageKey} = this.state;
    console.log(`Start retrieving private image url for ${privateImageKey}`);
    Storage.get(privateImageKey, {"level": "private"})
      .then(result => {
        console.log("Got result for private image URL: ", result);
        this.setState({privateImageUrl: result});
      });
  }

  drawPublicImage = (imageKey) => {
    console.log("---- drawPublicImage ----", imageKey);
    const {publicImageURLs} = this.state;
    const {bucket, region} = AWSCongitoS3Storage;
    const imageURL = `https://${bucket}.s3.${region}.amazonaws.com/public/${imageKey}`;
    publicImageURLs[imageKey] = imageURL;
    console.log("---- drawPublicImage ----", imageURL);
    this.setState({
      publicImageURLs,
    });
  }

  render() {
    const currentUser = this.state.user;
    const currentUserName = currentUser ? currentUser.username : "Anonymous";
    const {publicFiles, protectedFiles, protectedOtherFiles, privateFiles, publicImageURLs} = this.state;

    return (
      <div>
        This is an Amazon Cognito example!
        <div>
          Current user is "{currentUserName}"
        </div>
        <div>
          <h2>Auth using Congito builtin provider</h2>
          <div>
            <label htmlFor="authUsername">Username</label>
            <input id="authUsername" type="text" value={this.state.username} onChange={this.handleUsernameChange} />
            <label htmlFor="authPassword">Password</label>
            <input id="authPassword" type="password" value={this.state.password} onChange={this.handlePasswordChange} />
            <label htmlFor="authEmail">Email</label>
            <input id="authEmail" type="text" value={this.state.email} onChange={this.handleEmailChange} />
            <label htmlFor="authPhone">Phone</label>
            <input id="authPhone" type="text" value={this.state.phone} onChange={this.handlePhoneNumberChange} />
            <div><button onClick={this.onSignIn}>Sign In</button></div>
            <div><button onClick={this.onSignUp}>Sign Up</button></div>
            <div><button onClick={this.onSignOut}>Sign Out</button></div>
          </div>
        </div>
        <hr />
        <div>
          <h2>Auth using Custom provider</h2>
          <div>
            <label htmlFor="customAuthUsername">Username</label>
            <input id="customAuthUsername" type="text" value={this.state.username} onChange={this.handleUsernameChange} />
            <label htmlFor="customAuthPassword">Password</label>
            <input id="customAuthPassword" type="password" value={this.state.password} onChange={this.handlePasswordChange} />
            <div><button onClick={this.onCustomSignIn}>Custom Sign In</button></div>
            <div><button onClick={this.onCustomSignOut}>Custom Sign Out</button></div>
          </div>
        </div>
        <hr />
        <div>
          <div>
            <h2>Upload public image</h2>
            <input type="file" accept='image/png' onChange={this.onImageUploadPublic} />
          </div>
          <div>
            <h2>Upload protected image</h2>
            <input type="file" accept='image/png' onChange={this.onImageUploadProtected} />
          </div>
          <div>
            <h2>Upload private image</h2>
            <input type="file" accept='image/png' onChange={this.onImageUploadPrivate} />
          </div>
        </div>
        <hr />
        <div>
          <h2>List of Uploaded images</h2>
          <div>
            <h4>Show list of all public images</h4>
            <div><button onClick={this.onPublicFilesReload}>Reload</button></div>
            {publicFiles &&
              publicFiles.map((f, i) => {
                return (
                  <div key={i}>
                    {f.key}
                    <button onClick={() => this.drawPublicImage(f.key)}>Show public accessable URL</button>
                    {publicImageURLs && publicImageURLs[f.key] && <div><img src={publicImageURLs[f.key]} /></div>}
                  </div>
                );
              })
            }
          </div>
          <div>
            <h4>Show list of all protected images</h4>
            <div><button onClick={this.onProtectedFilesReload}>Reload</button></div>
            {protectedFiles &&
              protectedFiles.map((f, i) => {
                return <div key={i}>{f.key}</div>;
              })
            }
          </div>
          <div>
            <h4>Show list of all protected images for a custom user</h4>
            <div><em>Ooops, looks like it is not working, amplify always return photos of current user</em></div>
            <label htmlFor="IdentityIdForProtectedImages">IdentityId</label>
            <input id="IdentityIdForProtectedImages" type="text" value={this.state.identityIdForProtectedList} onChange={this.handleProtectedIdChanged} />
            <div><button onClick={this.onOtherProtectedFilesReload}>Reload</button></div>
            {protectedOtherFiles &&
              protectedOtherFiles.map((f, i) => {
                return <div key={i}>{f.key}</div>;
              })
            }
          </div>
          <div>
            <h4>Show list of all private images</h4>
            <div><button onClick={this.onPrivateFilesReload}>Reload</button></div>
            {privateFiles &&
              privateFiles.map((f, i) => {
                return <div key={i}>{f.key}</div>;
              })
            }
          </div>
        </div>
        <hr />
        <div>
          <h2>Show Uploaded images</h2>
          <div>
            <h4>Show public image</h4>
            <label htmlFor="publicImageKey">Public Image Key</label>
            <input id="publicImageKey" type="text" value={this.state.publicImageKey} onChange={this.handlePublicImageKeyChanged} />
            <div><button onClick={this.onShowPublicImage}>Show</button></div>
            {this.state.publicImageUrl && <img src={this.state.publicImageUrl} />}
          </div>
          <div>
            <h4>Show protected image</h4>
            <label htmlFor="protectedImageKey">Protected Image Key</label>
            <input id="protectedImageKey" type="text" value={this.state.protectedImageKey} onChange={this.handleProtectedImageKeyChanged} />
            <div><button onClick={this.onShowProtectedImage}>Show</button></div>
            {this.state.protectedImageUrl && <img src={this.state.protectedImageUrl} />}
          </div>
          <div>
            <h4>Show private image</h4>
            <label htmlFor="privateImageKey">Private Image Key</label>
            <input id="privateImageKey" type="text" value={this.state.privateImageKey} onChange={this.handlePrivateImageKeyChanged} />
            <div><button onClick={this.onShowPrivateImage}>Show</button></div>
            {this.state.privateImageUrl && <img src={this.state.privateImageUrl} />}
          </div>
        </div>
      </div>
    );
  }

}


export default App;
