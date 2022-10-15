import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import IUser from "../interfaces/uer.interface";

@Injectable()
export class YTService {
  constructor(private readonly httpService: HttpService) {}
  async getYoutubeChannels(userInfo: IUser): Promise<string> {
    // console.log(userInfo);
    const headersRequest = {
        'Accept': 'application/json', 
        'Authorization': `Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk1NTEwNGEzN2ZhOTAzZWQ4MGM1NzE0NWVjOWU4M2VkYjI5YjBjNDUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJuYmYiOjE2NjU3NjY3MzgsImF1ZCI6IjE3MzEwODk5NjUtNWxyOGpuNG5wYmk3aTNmbGsxMDFiOWRyM29yNGVuaTMuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDU0Nzc0NjczODc0OTE0NzI3MzEiLCJlbWFpbCI6InN1YmJhLmpudkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXpwIjoiMTczMTA4OTk2NS01bHI4am40bnBiaTdpM2ZsazEwMWI5ZHIzb3I0ZW5pMy5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsIm5hbWUiOiJzdWJyYW1hbnlhIFNoZW5veSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BTG01d3UzMW1QbFRTZTM2ZVhKUnZnYVFEZ2Y5SnpTWm5yRjZKQmtvOUxqLUhRPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6InN1YnJhbWFueWEiLCJmYW1pbHlfbmFtZSI6IlNoZW5veSIsImlhdCI6MTY2NTc2NzAzOCwiZXhwIjoxNjY1NzcwNjM4LCJqdGkiOiIzODc3MjcxZTk4ZDcwYzZiNmE1MmMwYzEyMjE3NzljN2E3ZDRmZWJlIn0.tya_Kp8XEgT8I52-IYD7Zf8SfTm00-MdbWESsdatWHRg-Lrc57LJjHeDsfAlCmAbR6lRCVjFKuYnajKu7WknPFKiipB-Sk9h5JDrXkUavbiuq1fiVh4FxxOnLK_CvjBdWeO9rcv4kf-D0YYZuXy6BHDmQ6zyMGp9cJpxaXT43JWACjt7NTubLZiSzVDBEQJf4IdJ3BskB6T9ilbvX-K4mIh_R-kQVmQCNEr5KsduRssGPZyN-uH0vWOCU4Pda88wT2hQPT_slymambWZjaD45NEjmu_i6mTFwtlr3hfGAKJSXcQQLbBvcFpITWpOk4QhjAK3b7CwJnASYZTP5de9XQ`,
    };
    const url = "https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&mine=true&key=AIzaSyD3UC4gXgSqRCdLzQ22eQ0jfSfydJk7H9Q"
    this.httpService.get(url, {headers: headersRequest})
    .subscribe((val) => {
        console.log("VALUEEEE ===>", val);
    });
    return "ee";
  }
}


// GET https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&mine=true&key=[YOUR_API_KEY] HTTP/1.1

// Authorization: Bearer [YOUR_ACCESS_TOKEN]
// Accept: application/json
