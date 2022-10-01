interface IFacebookUser {
    name: string,
    email: string,
    picture: {
        data: {
            height: number,
            is_silhouette: boolean,
            url: string,
            width: number
        }
    }
    id: string,
    accessToken: string,
    userID: string,
    expiresIn: 4511,
    signedRequest: string,
    graphDomain: string,
    data_access_expiration_time: number
}

export default IFacebookUser;